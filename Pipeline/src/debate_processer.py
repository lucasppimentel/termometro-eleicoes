# Utils
from src.my_utils import (
    download_audio,
    create_path,
    transcribe_with_whisper,
    normalize_scores,
    extract_video_info,
    find_best_match,
    best_match_with_splits,
)
from src.database import Neo4jDatabase

# AI
from src.prompts import (
    identifier_template,
    debate_info_template,
    proposal_template,
    coherence_template,
    relevance_template,
    s_summary_template,
    q_summary_template,
    qa_template,
)
from langchain.chat_models import init_chat_model
from pyannote.audio import Pipeline as pya_Pipeline
from transformers import pipeline as hf_pipeline
import torch

# Processamento de dados
from pydantic import BaseModel, Field, ValidationError
from openai import RateLimitError  # funciona com SDK atual
from langchain_core.exceptions import LangChainException
from typing import List, Optional, Dict, Any, Union
import networkx as nx
import asyncio
from tqdm import tqdm
from tqdm.asyncio import tqdm as tqdm_asyncio
import numpy as np
from nltk.tokenize import sent_tokenize
from sentence_transformers import SentenceTransformer
import nltk
import re
from thefuzz import process
import pickle
import pandas as pd
import json

# Ambiente
import os
import sys
import logging
import dotenv

# Configure logging
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("openai").setLevel(logging.ERROR)

# Module-level logger
logger = logging.getLogger(__name__)

dotenv.load_dotenv()

# ================================
# Constants
# ================================
DEFAULT_DEBATE_START = 0 # seconds
DEFAULT_SAMPLE_LENGTH = 2100  # seconds
DEFAULT_SPEECH_MAX_PAUSE = 20  # seconds
MIN_OVERLAP_PROPORTION = 0.1
MIN_TEXT_LENGTH = 20
MAX_RETRY_ATTEMPTS = 3
TRANSCRIPT_FILENAME = "transcript.pkl"
DIARIZATION_FILENAME = "df_dia.pkl"
DESCRIPTION_FILENAME = "description.pkl"

# ================================
# Configurações para Embeddings
# ================================
nltk.download("punkt", quiet=True)
nltk.download("punkt_tab", quiet=True)

# ================================
# Configurações para PyTorch
# ================================
torch.backends.cuda.matmul.allow_tf32 = True
torch.backends.cudnn.allow_tf32 = True

# ================================
# Configurações de APIs
# ================================
pipeline = pya_Pipeline.from_pretrained(
    "pyannote/speaker-diarization-3.1",
    use_auth_token=os.getenv("HF_API_KEY"),
)

# ================================
# Configurações do Classificador
# ================================
classifier = hf_pipeline(
    "zero-shot-classification",
    model="joeddav/xlm-roberta-large-xnli",  # suporta PT
)

CLASSIFICATION_LABELS = [
    "Propositiva",
    "Ataque",
    "Defesa",
    "Provocação",
    "Apelo emocional",
    "Apelo à autoridade",
    "Fuga ou evasiva",
    "Ataque indireto",
    "Autopromoção",
]


class DebateProcesser:
    """Processador de debates eleitorais para extração e análise de conteúdo."""

    def __init__(
        self,
        video_id: str,
        database: Neo4jDatabase,
        sample_length: int = DEFAULT_SAMPLE_LENGTH,
        debate_start: int = DEFAULT_DEBATE_START,
        manual_identification: bool = False,
    ) -> None:
        """
        Inicializa o processador de debates.

        Args:
            video_id: ID do vídeo do YouTube
            database: Instância do banco de dados Neo4j
            sample_length: Tempo em segundos do sample usado para identificação
                          dos participantes (padrão: 2100s)
        """
        # Config
        self.debate_start = debate_start
        self.database: Neo4jDatabase = database
        self.sample_length: int = sample_length
        self.video_id: str = video_id
        self.folder_path: str = f"./data/downloads/{self.video_id}"
        self.speech_max_pause: int = DEFAULT_SPEECH_MAX_PAUSE
        self.manual_identification = manual_identification

        # Dados Intermediários
        self.transcript: Optional[pd.DataFrame] = None
        self.sample: Optional[str] = None
        self.description: Optional[Dict[str, Any]] = None
        self.identification_failed: bool = False
        self.df_dia: Optional[pd.DataFrame] = None
        self.df_identified: Optional[pd.DataFrame] = None
        self.debate: Optional[Dict[str, Any]] = None

        # Outputs
        self.phrases: Optional[pd.DataFrame] = None
        self.speeches: Optional[pd.DataFrame] = None

    def download_and_transcribe(self) -> None:
        """
        Faz o download do áudio do debate e transcreve usando Whisper.

        Raises:
            Exception: Se o arquivo baixado estiver vazio.
        """
        # Download do áudio do vídeo em formato .webm ou .m4a
        create_path(self.folder_path)
        
        # Verifica se já existe descrição salva
        description_pkl = os.path.join(self.folder_path, DESCRIPTION_FILENAME)
        if os.path.exists(description_pkl):
            logger.info("Loading existing description")
            with open(description_pkl, "rb") as f:
                self.description = pickle.load(f)
        else:
            logger.info("Extracting video info")
            self.description = extract_video_info(self.video_id)
            with open(description_pkl, "wb") as f:
                pickle.dump(self.description, f)

        # Verifica se já existe áudio baixado e não está vazio
        audio_path: Optional[str] = None
        for ext in [".m4a", ".webm", ".mp4", ".wav"]:
            candidate = os.path.join(self.folder_path, f"video{ext}")
            if os.path.exists(candidate):
                # Verificar se o arquivo não está vazio
                if os.path.getsize(candidate) > 0:
                    audio_path = candidate
                    break
                else:
                    # Remover arquivo vazio
                    logger.info(f"Removing empty file: {candidate}")
                    try:
                        os.remove(candidate)
                    except OSError as e:
                        logger.warning(f"Failed to remove empty file {candidate}: {e}")

        # Verifica se já existe transcrição salva
        transcript_pkl = os.path.join(self.folder_path, TRANSCRIPT_FILENAME)
        transcript_exists = os.path.exists(transcript_pkl)

        if not audio_path and not transcript_exists:
            downloaded_file = download_audio(
                f"https://www.youtube.com/watch?v={self.video_id}",
                output_path=os.path.join(self.folder_path, "video.%(ext)s"),
            )
            # Verificar se o download foi bem-sucedido
            if downloaded_file and os.path.exists(downloaded_file):
                if os.path.getsize(downloaded_file) == 0:
                    raise Exception(f"Downloaded file is empty: {downloaded_file}")

        # Se já existe transcrição salva, carrega ela
        if transcript_exists:
            logger.info("Loading existing transcript")
            with open(transcript_pkl, "rb") as f:
                segments = pickle.load(f)
        else:
            logger.info("Transcribing audio with Whisper")
            segments = transcribe_with_whisper(self.folder_path)
            with open(transcript_pkl, "wb") as f:
                pickle.dump(segments, f)

        # Amostra que será usada para identificação dos participantes
        transcript = pd.DataFrame(segments)
        in_sample = (transcript["start"] >= self.debate_start) & (transcript["start"] <= (self.sample_length + self.debate_start))

        sample = transcript.loc[in_sample]
        sample = " ".join([item["text"] for _, item in sample.iterrows()])

        self.transcript = transcript.loc[transcript["start"] >= self.debate_start]
        self.sample = sample
    
    def identify_video_info(self) -> None:
        """Identifica informações do debate usando LLM."""
        # OpenAI call para identificar candidatos em trechos
        gpt_5_mini = init_chat_model(
            model="gpt-5-mini",
            model_provider="openai",
            verbosity="medium",
            reasoning={"effort": "low"},
        )

        chain = debate_info_template | gpt_5_mini
        response = chain.invoke(
            {
                "video_title": self.description["title"],
                "video_description": self.description["description"],
                "transcription_segment": self.sample,
                "video_publish_date": self.description["upload_date"],
            }
        )

        self.debate = json.loads(response.content[0]["text"])

        # Obter os valores de cargos e cidades do banco de dados
        query_cargos = "MATCH (c:Cargo) RETURN DISTINCT c.ds_cargo AS cargo"
        query_cidades = (
            "MATCH (e:Eleicao) WHERE e.uf = $estado "
            "RETURN DISTINCT e.nm_ue AS cidade"
        )

        result_cargos: List[str] = []
        result_cidades: List[str] = []
        tentativas = MAX_RETRY_ATTEMPTS

        while tentativas > 0:
            try:
                with self.database.driver.session() as session:
                    result_cargos = [
                        record["cargo"] for record in session.run(query_cargos)
                    ]
                    result_cidades = [
                        record["cidade"]
                        for record in session.run(
                            query_cidades, estado=self.debate["estado"]
                        )
                    ]
                    break
            except Exception as e:
                logger.error(f"Erro ao consultar o banco de dados: {e}")
                tentativas -= 1

        # Encontrar as melhores correspondências no banco para os valores que a LLM retornou
        cargo_corresp = find_best_match(self.debate["cargo"], result_cargos)
        cidade_corresp = find_best_match(self.debate["municipio"], result_cidades)

        # Corrigir valores retornados
        self.debate["municipio"] = cidade_corresp
        self.debate["cargo"] = cargo_corresp


    def identify_speakers(self) -> None:
        """
        Identifica os participantes do debate.
        Pode falhar silenciosamente e delegar para human-in-the-loop.
        """

        # Sempre carregar candidatos válidos do banco
        query_candidatos = """
        MATCH (e:Eleicao) <-[:DISPUTA]- (c:Candidato) -[:CONCORRE_AO]-> (cg:Cargo)
            WHERE   e.uf = $estado
            AND     cg.ds_cargo = $cargo
            AND     e.nm_ue = $municipio
        RETURN DISTINCT c.nome AS nome, c.titulo_eleitoral AS documento, c.nome_urna AS nome_urna
        """

        tentativas = MAX_RETRY_ATTEMPTS
        while tentativas > 0:
            try:
                with self.database.driver.session() as session:
                    result = session.run(
                        query_candidatos,
                        estado=self.debate["estado"],
                        cargo=self.debate["cargo"],
                        municipio=self.debate["municipio"],
                    )

                    self.result_candidatos = []
                    self.result_documentos = {}

                    for record in result:
                        nome = record["nome_urna"]
                        doc = str(record["documento"])
                        self.result_candidatos.append(nome)
                        self.result_documentos[nome] = doc
                        
                break
            except Exception as e:
                logger.error(f"Erro ao consultar o banco de dados: {e}")
                tentativas -= 1
                

        if self.manual_identification:
            logger.info("Manual identification enforced. Skipping LLM speaker identification.")
            self.identification_failed = True
            return

        # ===== LLM IDENTIFICATION =====
        gpt_5 = init_chat_model(
            model="gpt-5",
            model_provider="openai",
            reasoning={"effort": "medium"},
        )

        chain = identifier_template | gpt_5
        response = chain.invoke({"transcription_segment": self.sample})

        pattern = r'Palestrante:\s([^\n]+)\s+Texto:\s"([^"]+)"'
        matches = re.findall(pattern, response.content[0]["text"])

        self.df_identified = pd.DataFrame(matches, columns=["Candidato", "Trecho"])
        self.df_identified = self.df_identified.loc[
            self.df_identified["Trecho"].str.len() > MIN_TEXT_LENGTH
        ]

        if self.df_identified["Candidato"].nunique() < 2:
            logger.warning("Less than two speakers identified. Falling back to manual identification.")
            self.identification_failed = True
            self.df_identified = None
            return

        # Match com banco
        def match_candidate(llm_name: str) -> pd.Series:
            matched = find_best_match(llm_name, self.result_candidatos)
            return pd.Series([matched, self.result_documentos.get(matched)])

        self.df_identified[["Candidato", "Titulo_Eleitoral"]] = (
            self.df_identified["Candidato"].apply(match_candidate)
        )

        valid = self.df_identified["Candidato"].notna().sum()
        if valid < 2:
            logger.warning("LLM candidates not matched in DB. Falling back to manual identification.")
            self.identification_failed = True
            self.df_identified = None

            return

        self.df_identified["Trecho_ID"] = self.df_identified.index

        # Verificar candidatos que foram correspondidos (encontrados na base)
        matched_candidates = (
            self.df_identified.loc[
                self.df_identified["Candidato"].notna(),
                "Candidato",
            ]
            .drop_duplicates()
            .tolist()
        )

        # Verificar se nenhum candidato foi encontrado na base
        if len(matched_candidates) == 0:
            error_msg = (
                f"Nenhum candidato foi encontrado na base de dados.\n"
                f"Candidatos identificados pelo LLM: {self.identified_by_llm}\n"
                f"Candidatos disponíveis na base: {self.result_candidatos if self.result_candidatos else 'Nenhum candidato encontrado para os critérios especificados'}\n"
                f"Critérios de busca: Cargo={self.debate['cargo']}, "
                f"Estado={self.debate['estado']}, Município={self.debate['municipio']}"
            )
            logger.error(error_msg)
            raise ValueError(error_msg)

        # Apresentar candidatos correspondidos com sucesso
        logger.info(
            f"Candidatos correspondidos e encontrados na base ({len(matched_candidates)}): "
            f"{matched_candidates}"
        )

        # Embedding das frases para encontrar correspondências entre transcrições e trechos
        embed_model = SentenceTransformer("all-MiniLM-L6-v2")
        self.transcript["embedding"] = self.transcript["text"].apply(
            lambda x: embed_model.encode(x, convert_to_tensor=True)
        )
        self.df_identified["embedding"] = self.df_identified["Trecho"].apply(
            lambda x: embed_model.encode(x, convert_to_tensor=True)
        )

        # Por serem frases de comprimentos diferentes, dividir todos os embeddings em sub embeddings
        self.df_identified["sub_embeddings"] = self.df_identified["Trecho"].apply(
            lambda t: [
                embed_model.encode(s, convert_to_tensor=True)
                for s in sent_tokenize(t)
            ]
        )

        # Encontrar correspondências
        self.transcript["Titulo_Eleitoral"] = None
        for _, speaker in self.df_identified.iterrows():
            best_idx, score = best_match_with_splits(speaker, self.transcript)
            transcript_idx = self.transcript.iloc[best_idx].name
            if best_idx is not None:
                self.transcript.loc[
                    transcript_idx, ["Candidato", "Titulo_Eleitoral"]
                ] = speaker[["Candidato", "Titulo_Eleitoral"]]
                self.transcript.loc[transcript_idx, "Trecho_ID"] = speaker["Trecho_ID"]

        self.transcript = self.transcript.drop(columns=["embedding"])
        self.df_identified = self.df_identified.drop(
            columns=["embedding", "sub_embeddings"]
        )

    
    def diarize_speakers(self, force_dia: bool = False) -> None:
        """
        Faz a diarização dos participantes do debate usando Pyannote.

        Args:
            force_dia: Se True, força o recálculo mesmo se já existir arquivo salvo.
        """
        if self.df_dia is None and not force_dia:
            # Checar se a diarização já foi feita
            diarization_pkl = os.path.join(self.folder_path, DIARIZATION_FILENAME)
            if os.path.exists(diarization_pkl) and not force_dia:
                logger.info("Loading existing diarization file")
                with open(diarization_pkl, "rb") as f:
                    self.df_dia = pickle.load(f)
            else:
                logger.info("Calculating diarization...")

                pipeline.to(torch.device("cuda"))
                audio_path = os.path.join(self.folder_path, "audio.wav")
                diarization = pipeline(audio_path)

                logger.info("Diarization completed")

                # Dataframe com segmentos e colunas de início e fim da diarização
                self.df_dia = pd.DataFrame(
                    data=list(diarization.itertracks(yield_label=True)),
                    columns=["Segment", "Track", "Speaker_ID"],
                )
                self.df_dia["Diarizacao_Start"] = self.df_dia["Segment"].apply(
                    lambda x: x.start
                )
                self.df_dia["Diarizacao_End"] = self.df_dia["Segment"].apply(
                    lambda x: x.end
                )

                # Salvar diarização
                with open(diarization_pkl, "wb") as f:
                    pickle.dump(self.df_dia, f)

        # Remove segmentos que terminam antes do debate_start (ou seja, que são totalmente anteriores).
        self.df_dia = self.df_dia.loc[
            self.df_dia["Diarizacao_End"] >= self.debate_start
        ].reset_index(drop=True)

        if "Candidato" in self.df_dia.columns:
            self.df_dia = self.df_dia.drop(columns=["Candidato"])

        if "Titulo_Eleitoral" in self.df_dia.columns:
            self.df_dia = self.df_dia.drop(columns=["Titulo_Eleitoral"])

        if self.identification_failed:
            logger.warning("Speaker identification failed. Using manual assignment.")

            self.df_dia = self._manual_assign_speakers(self.df_dia)

            self.transcript = self.transcript.rename(columns={"start": "Transcription_Start", "end": "Transcription_End", "text": "Transcription_Text"})
            self.transcript["key_tmp"] = 1
            self.df_dia["key_tmp"] = 1

            self.df_identified = self.df_dia[["Candidato", "Titulo_Eleitoral"]].drop_duplicates()
        else:
            # Nesse ponto, `transcript` e `df_dia` são Data Frames com trechos, mas os inícios e fins
            # não coincidem exatamente.
            # Abaixo é feito um merge nas linhas onde os tempos de sobrepõem.
            self.transcript = self.transcript.rename(columns={"start": "Transcription_Start", "end": "Transcription_End", "text": "Transcription_Text"})
            self.transcript["key_tmp"] = 1
            self.df_dia["key_tmp"] = 1

            required_cols = {"Candidato", "Titulo_Eleitoral"}
            if not required_cols.issubset(self.transcript.columns):
                raise RuntimeError(
                    "Identificação automática esperada, mas transcript não contém "
                    "'Candidato' e 'Titulo_Eleitoral'."
                )

            merge_tmp = pd.merge(left=self.df_dia, right=self.transcript[["Transcription_Start", "Transcription_End", "key_tmp", "Titulo_Eleitoral", "Candidato"]], how="left", on="key_tmp")

            mask = (
                (merge_tmp["Diarizacao_Start"] <= merge_tmp["Transcription_End"]) & 
                (merge_tmp["Diarizacao_End"] >= merge_tmp["Transcription_Start"]) & 
                (~merge_tmp["Candidato"].isnull())
            )
            merge_tmp = merge_tmp.loc[mask]
            merge_tmp["Overlap"] = np.maximum(
                0,
                np.minimum(merge_tmp["Diarizacao_End"], merge_tmp["Transcription_End"]) - 
                np.maximum(merge_tmp["Diarizacao_Start"], merge_tmp["Transcription_Start"])
            )
            merge_tmp["Speech_Duration"] = merge_tmp["Diarizacao_End"] - merge_tmp["Diarizacao_Start"]
            merge_tmp["Proportion_Overlap"] = merge_tmp["Overlap"] / merge_tmp["Speech_Duration"]
            merge_tmp = merge_tmp.loc[merge_tmp["Proportion_Overlap"] >= 0.1]

            # Determinar o candidato mais frequentemente associado a cada Speaker_ID
            merge_tmp = merge_tmp.groupby("Speaker_ID")["Candidato"].apply(lambda x: x.mode()[0])
            merge_tmp = merge_tmp.to_dict()

            # Atualizar candidato
            documentos = self.transcript[["Candidato", "Titulo_Eleitoral"]].drop_duplicates().set_index("Candidato")["Titulo_Eleitoral"].to_dict()
            self.df_dia["Candidato"] = self.df_dia["Speaker_ID"].replace(merge_tmp)
            self.df_dia["Titulo_Eleitoral"] = self.df_dia["Candidato"].replace(documentos)
            del merge_tmp

        # Tanto a diarização quando a transcrição foram feitas em segmentos.
        # Agora é necessário juntar os segmentos para ter os discursos completo de cada candidato.
        self.speeches = self.df_dia.sort_values(by=["Diarizacao_Start"])

        # Determinar segmentos seguidos de um mesmo candidato
        self.speeches["Shifted_end"] = self.speeches["Diarizacao_End"].shift(1)
        self.speeches["Shifted_Candidato"] = self.speeches["Candidato"].shift(1)
        self.speeches["Speech"] = (
            (
                self.speeches["Diarizacao_Start"] - self.speeches["Shifted_end"]
                > self.speech_max_pause
            )
            | (self.speeches["Candidato"].shift(1) != self.speeches["Candidato"])
        ).cumsum()

        # Agrupar segmentos em discursos
        self.speeches = self.speeches.groupby(["Speech"], as_index=False).agg(
            {
                "Candidato": "first",
                "Diarizacao_Start": "min",
                "Diarizacao_End": "max",
            }
        )
        self.speeches = self.speeches.rename(
            columns={"Diarizacao_Start": "Start", "Diarizacao_End": "End"}
        )

        # Determinar todos os textos que fazem parte do speech
        self.speeches["key_tmp"] = 1
        merge_tmp = pd.merge(
            left=self.speeches,
            right=self.transcript[
                ["Transcription_Start", "Transcription_End", "Transcription_Text", "key_tmp"]
            ],
            how="left",
            on="key_tmp",
        )

        mask = (
            (merge_tmp["Start"] <= merge_tmp["Transcription_End"])
            & (merge_tmp["End"] >= merge_tmp["Transcription_Start"])
            & (~merge_tmp["Candidato"].isnull())
        )
        merge_tmp = merge_tmp.loc[mask]

        merge_tmp["overlap_time"] = (
            (merge_tmp["Transcription_End"] - merge_tmp["Start"])
            - np.maximum(merge_tmp["Transcription_Start"] - merge_tmp["Start"], 0)
            - np.maximum(merge_tmp["Transcription_End"] - merge_tmp["End"], 0)
        )

        # O transcription pode estar duplicado, por conta da sobreposição entre os tempos
        # de início/fim da transcrição vs os tempos da diarização.
        # Vou manter o texto como parte do 'speech' que tem a maior sobreposição com ele
        merge_tmp = merge_tmp.sort_values("overlap_time", ascending=False).drop_duplicates(
            "Transcription_Start", keep="first"
        )

        # Gerar texto completo de cada speech
        merge_tmp = merge_tmp.sort_values("Transcription_Start")
        merge_tmp_agrupado = (
            merge_tmp.groupby("Speech", sort=False)["Transcription_Text"]
            .apply(lambda x: "".join(x))
            .reset_index()
        )

        merge_tmp_agrupado = merge_tmp_agrupado.rename(
            columns={"Transcription_Text": "Text"}
        )
        self.speeches = self.speeches.merge(merge_tmp_agrupado, how="left", on="Speech")
        self.speeches = self.speeches.drop(columns=["key_tmp"])

        # Gerar base de dados com frases individuais, para maior granularidade
        self.phrases = merge_tmp.copy()
        self.phrases = self.phrases.drop(columns=["Start", "End", "overlap_time"]).rename(
            columns={
                "Transcription_Start": "Start",
                "Transcription_End": "End",
                "Transcription_Text": "Text",
            }
        )

        del merge_tmp
        del merge_tmp_agrupado

        self.speeches = self.speeches.loc[~self.speeches["Text"].isna()].reset_index(
            drop=True
        )
        self.phrases = self.phrases.loc[~self.phrases["Text"].isna()].reset_index(
            drop=True
        )
    
    def get_proposals(self) -> None:
        """Obter propostas feitas nos discursos."""
        # Inicialize o modelo GPT-4o-mini
        gpt_4o_mini = init_chat_model(model="gpt-4o-mini", model_provider="openai")

        chain = proposal_template | gpt_4o_mini

        self.speeches["Proposta"] = None
        for idx, row in self.speeches.iterrows():
            speech_text = row["Text"]
            if speech_text and speech_text.strip():
                response = chain.invoke(speech_text)
                proposta = response.content
                self.speeches.at[idx, "Proposta"] = proposta

        self.speeches["Proposta"] = self.speeches["Proposta"].replace(
            "Sem propostas", None
        )
    
    def classify_phrases(self) -> None:
        """Classifica as frases em categorias usando HuggingFace Zero-Shot Classifier."""
        total = len(self.speeches)
        for idx, row in self.speeches.iterrows():
            # Log progresso
            progress = idx / total * 100
            if idx % 10 == 0:  # Log a cada 10 iterações para não poluir
                logger.debug(f"Classification progress: {progress:.2f}%")

            # Pular falas vazias
            index = self.speeches.index[idx]
            if (
                self.speeches.loc[index, "Text"] is None
                or self.speeches.loc[index, "Text"].strip() == ""
            ):
                continue

            # Classificar e normalizar resultados
            results = classifier(
                self.speeches.loc[index, "Text"],
                candidate_labels=CLASSIFICATION_LABELS,
                multi_label=True,
            )["scores"]
            results = normalize_scores(results)

            self.speeches.loc[index, CLASSIFICATION_LABELS] = results

    
    def ingest_into_database(self) -> None:
        """Ingere os dados obtidos no banco de dados."""
        debate_id = self.video_id
        debate_title = self.description["title"]
        debate_date = self.description["upload_date"]
        debate_cargo = self.debate.get("cargo", "")
        debate_municipio = self.debate.get("municipio", "")
        debate_estado = self.debate.get("estado", "")
        debate_ano = self.debate.get(
            "ano", debate_date[:4] if debate_date else ""
        )

        with self.database.driver.session() as session:
            logger.info("Ingesting debate node...")

            # Ingest debate node
            session.run(
                """
                MERGE (d:Debate {debate_id: $debate_id})
                SET d.title = $title, d.date = $date, d.cargo = $cargo, 
                    d.municipio = $municipio, d.estado = $estado
                """,
                {
                    "debate_id": debate_id,
                    "title": debate_title,
                    "date": debate_date,
                    "cargo": debate_cargo,
                    "municipio": debate_municipio,
                    "estado": debate_estado,
                },
            )

            logger.info("Linking to Cargo node...")

            # Relate Debate to Cargo
            session.run(
                """
                MATCH (d:Debate {debate_id: $debate_id})
                MATCH (cg:Cargo {ds_cargo: $cargo})
                MERGE (d)-[:REFERE_AO_CARGO]->(cg)
                """,
                {"debate_id": debate_id, "cargo": debate_cargo},
            )

            logger.info("Linking to Ano node...")

            # Relate Debate to Ano
            session.run(
                """
                MATCH (d:Debate {debate_id: $debate_id})
                MATCH (a:Ano {ano: $ano})
                MERGE (d)-[:OCORRE_NO_ANO]->(a)
                """,
                {"debate_id": debate_id, "ano": int(debate_ano)},
            )

            logger.info("Ingesting speech nodes...")

            # Ingest speeches
            total_speeches = len(self.speeches)
            for idx, row in self.speeches.iterrows():
                progress = idx / total_speeches * 100
                if idx % 10 == 0:
                    logger.debug(f"Ingestion progress: {progress:.2f}%")

                titulo_eleitoral = self.df_identified.loc[
                    self.df_identified["Candidato"] == row["Candidato"],
                    "Titulo_Eleitoral",
                ]
                if len(titulo_eleitoral) > 0 or row.get("is_question"):
                    titulo_eleitoral = (
                        titulo_eleitoral.iloc[0] if len(titulo_eleitoral) else 0
                    )
                else:
                    logger.warning(
                        f"Candidato {row['Candidato']} não encontrado no banco de dados. "
                        "Pulando discurso."
                    )
                    continue

                session.run(
                    """
                    MATCH (c:Candidato {titulo_eleitoral: $titulo})
                    MATCH (d:Debate {debate_id: $debate_id})
                    MERGE (s:Speech {speech_id: $speech_id})
                    SET s.text = $text, s.start = $start, s.end = $end

                    MERGE (c)-[:PARTICIPOU_DO_DEBATE]->(d)
                    MERGE (c)-[:PROFERIU]->(s)
                    MERGE (d)-[:TEM_DISCURSO]->(s)
                    """,
                    {
                        "titulo": int(titulo_eleitoral),
                        "debate_id": debate_id,
                        "speech_id": f"{debate_id}_{row['Speech']}",
                        "text": row["Text"],
                        "summary": row.get("summary"),
                        "question": row.get("question"),
                        "start": row["Start"],
                        "end": row["End"],
                    },
                )

                # Ingest each proposal if present (list of proposals)
                propostas = row.get("Proposta")
                if propostas and isinstance(propostas, list):
                    for i, proposta in enumerate(propostas):
                        if proposta and str(proposta).strip():
                            session.run(
                                """
                                MATCH (c:Candidato {titulo_eleitoral: $titulo})
                                MATCH (s:Speech {speech_id: $speech_id})
                                MERGE (p:Proposal {proposal_id: $proposal_id})
                                SET p.text = $proposal_text
                                MERGE (c)-[:FEZ_PROPOSTA]->(p)
                                MERGE (s)-[:CONTEM_PROPOSTA]->(p)
                                """,
                                {
                                    "titulo": titulo_eleitoral,
                                    "speech_id": f"{debate_id}_{row['Speech']}",
                                    "proposal_id": (
                                        f"{debate_id}_{row['Speech']}_proposal_{i}"
                                    ),
                                    "proposal_text": proposta,
                                },
                            )
                elif propostas and str(propostas).strip():
                    # Caso seja string única
                    session.run(
                        """
                        MATCH (c:Candidato {titulo_eleitoral: $titulo})
                        MATCH (s:Speech {speech_id: $speech_id})
                        MERGE (p:Proposal {proposal_id: $proposal_id})
                        SET p.text = $proposal_text
                        MERGE (c)-[:FEZ_PROPOSTA]->(p)
                        MERGE (s)-[:CONTEM_PROPOSTA]->(p)
                        """,
                        {
                            "titulo": int(titulo_eleitoral),
                            "speech_id": f"{debate_id}_{row['Speech']}",
                            "proposal_id": f"{debate_id}_{row['Speech']}_proposal",
                            "proposal_text": propostas,
                        },
                    )

            logger.info("Speech ingestion completed")
    
    async def calculate_discussions(self) -> None:
        """Processa o contexto de discussões."""

        # ================================
        # Análise de Coerência das Discussões
        # ================================
        class RelatedSpeechesResponse(BaseModel):
            related_indices: List[List[int]] = Field(
                description=(
                    "Lista de tuplas de índices (inteiros) das Falas que fazem "
                    "parte do mesmo contexto."
                )
            )

        class RelatedSpeeches(BaseModel):
            related_indices: List[List[int]] = Field(
                description=(
                    "Lista de tuplas de índices (inteiros) das Falas que fazem "
                    "parte do mesmo contexto."
                )
            )
            anchor_index: int = Field(
                description="Índice da fala âncora no DataFrame 'speeches'."
            )

        # Configuração do LLM (usando um placeholder para o seu setup)
        coherence_finder = init_chat_model(model="gpt-4.1-mini", model_provider="openai")
        structured_coherence_finder = coherence_finder.with_structured_output(RelatedSpeechesResponse)
        coherence_chain = coherence_template | structured_coherence_finder

        async def process_anchor_speech(
            df: pd.DataFrame, anchor_index: int, window_size: int = 6
        ) -> Optional[RelatedSpeeches]:
            """
            Relaciona frases baseado no contexto entre elas.

            Args:
                df: O DataFrame speeches.
                anchor_index: O índice da fala que contém a pergunta.
                window_size: Quantidade de falas a considerar antes e depois da âncora.

            Returns:
                RelatedSpeeches ou None em caso de erro.
            """
            # Definindo a janela de contexto
            start_index = anchor_index
            end_index = min(len(df) - 1, anchor_index + window_size)

            # Falas do contexto (incluindo a âncora)
            context_df = df.iloc[start_index : end_index + 1].copy()

            # 1. Formatando o contexto para o Prompt do LLM
            context_speeches = []

            for idx, row in context_df.iterrows():
                context_speeches.append(
                    f"[{idx}] ({int(row['Start'])}s): \"{row['Text'].strip()}\""
                )

            context_speeches_str = "\n".join(context_speeches)

            # 2. Invocando o LLM
            try:
                response = await coherence_chain.ainvoke(
                    {
                        "anchor_index": anchor_index,
                        "anchor_text": df.loc[anchor_index, "Text"],
                        "context_speeches": context_speeches_str,
                    }
                )

                # O Pydantic já garante a estrutura da resposta
                return RelatedSpeeches(
                    related_indices=response.related_indices, anchor_index=anchor_index
                )

            except ValidationError as e:
                logger.error(
                    f"Erro de validação Pydantic no índice {anchor_index}: {e}"
                )
                return None
            except Exception as e:
                logger.error(f"Erro ao processar LLM no índice {anchor_index}: {e}")
                return None


        async def process_discussion_coherence(
            df: pd.DataFrame, window_size: int = 10
        ) -> List[RelatedSpeeches]:
            """
            Batch processing para função `process_anchor_speech`.

            Args:
                df: DataFrame com os speeches.
                window_size: Tamanho da janela de contexto.

            Returns:
                Lista de RelatedSpeeches identificados.
            """
            # 1. Encontra os índices das perguntas âncora
            # anchor_indices = df[df["is_question"] == True].index.tolist()
            anchor_indices = list(range(0, len(df), 3))

            if not anchor_indices:
                logger.warning(
                    "Nenhuma pergunta detectada. Processamento encerrado."
                )
                return []

            logger.info(
                f"Detectadas {len(anchor_indices)} perguntas âncora para análise de coerência."
            )

            # 2. Cria e executa as tarefas assíncronas em batches
            tasks = [
                process_anchor_speech(df, index, window_size)
                for index in anchor_indices
            ]

            # Executa todas as tarefas de forma assíncrona
            results = await tqdm_asyncio.gather(
                *tasks, desc="Analisando Coerência das Discussões"
            )

            # Filtra resultados nulos (erros ou falhas na validação)
            return [r for r in results if r is not None]

        all_coherence_results = await process_discussion_coherence(self.speeches)

        # A lista de resultados é o input desta função
        def assign_discussion_ids(
            df: pd.DataFrame, results: List[RelatedSpeeches]
        ) -> pd.DataFrame:
            """
            Cria um grafo de relações entre as falas, usa componentes conexas
            para agrupar as falas em IDs de Discussão únicas.

            Args:
                df: DataFrame com os speeches.
                results: Lista de RelatedSpeeches identificados.

            Returns:
                DataFrame com IDs de discussão atribuídos.
            """
            # Inicializar o Grafo de Relações e Colunas
            G = nx.Graph()
            G.add_nodes_from(df.index.tolist())

            # Nova coluna para o ID do agrupamento
            df["ID_Discussao"] = None

            # Popular o Grafo com as Relações Identificadas pelo LLM
            for result in results:
                if not result.related_indices:
                    continue

                # Conecta todas as falas relacionadas entre si para formar o componente
                for indices_to_connect in result.related_indices:
                    for i in range(len(indices_to_connect)):
                        for j in range(i + 1, len(indices_to_connect)):
                            G.add_edge(indices_to_connect[i], indices_to_connect[j])

            # Atribuir IDs de Discussão usando Componentes Conexas
            discussion_id_counter = 0

            # Itera sobre os grupos de nós (falas) que estão conectados
            for component in nx.connected_components(G):
                # Só consideramos uma Discussão se houver mais de uma fala conectada
                if len(component) > 1:
                    discussion_id_counter += 1
                    current_id = discussion_id_counter

                    # Converte o conjunto de nós para uma lista de índices
                    component_indices = list(component)

                    # Atribuição no DataFrame
                    for idx in component_indices:
                        df.loc[idx, "ID_Discussao"] = current_id

            logger.info(
                f"Processamento concluído. {discussion_id_counter} Discussões agrupadas."
            )

            # Remove o ID_Discussao de falas que não foram agrupadas (componente de 1 nó)
            df.loc[df["ID_Discussao"].isna(), "ID_Discussao"] = None

            # Renomeia a coluna para refletir a nova lógica
            df = df.rename(columns={"Alvo_Da_Fala": "Alvo"})

            return df

        self.speeches = assign_discussion_ids(self.speeches, all_coherence_results)

        async def classify_response_relationship(
            df: pd.DataFrame,
        ) -> pd.DataFrame:
            """
            Identifica quais frases são respostas a perguntas dentro de cada discussão.

            Args:
                df: DataFrame com os speeches.

            Returns:
                DataFrame com relações Q&A identificadas.
            """
            qa_chain = qa_template | init_chat_model(
                model="gpt-5-mini",
                reasoning={"effort": "low"},
                model_provider="openai",
            )

            df["is_question"] = False
            df["question_idx"] = None

            async def process_discussion_qa(group: tuple) -> None:
                """Processa Q&A para um grupo de discussão."""
                context_speeches = []

                for idx, row in group[1].iterrows():
                    context_speeches.append(
                        f"[{idx}] ({row['Start']}s) Candidato {row['Candidato']}: "
                        f"\"{row['Text'].strip()}\""
                    )

                context_speeches_str = "\n".join(context_speeches)
                qa_response = await qa_chain.ainvoke(
                    {"context_speeches": context_speeches_str}
                )

                results = qa_response.content[0]["text"]
                topico = re.findall(r"Tópico: (.+)", qa_response.content[0]["text"])
                topico = topico[0] if len(topico) > 0 else ""
                results = re.findall(r"\((\d+)\) -> \((\d+)\)", results)

                df.loc[group[1].index, "topic"] = topico

                for result in results:
                    df.loc[int(result[0]), "question_idx"] = int(result[1])
                    df.loc[int(result[1]), "is_question"] = True

            # Rodar o processamento assíncrono por grupos de Discussão em batches
            tasks = [
                process_discussion_qa(group) for group in df.groupby("ID_Discussao")
            ]
            await tqdm_asyncio.gather(*tasks, desc="Analisando Q&A das Discussões")

            return df

        self.speeches = await classify_response_relationship(self.speeches)

        # ================================
        # Resumo das Perguntas
        # ================================

        def summary_questions(df: pd.DataFrame) -> pd.DataFrame:
            """
            Gera resumos das perguntas.

            Args:
                df: DataFrame com os speeches.

            Returns:
                DataFrame com resumos das perguntas.
            """
            q_summary_chain = q_summary_template | init_chat_model(
                model="gpt-4.1-mini", model_provider="openai"
            )

            df["question"] = None
            questions_df = df.loc[df["is_question"] == True]
            total = len(questions_df)

            for idx, q_row in questions_df.iterrows():
                progress = idx / total * 100
                if idx % 5 == 0:
                    logger.debug(f"Question summary progress: {progress:.2f}%")

                context_speeches = []

                discussion_id = q_row["ID_Discussao"]
                discussion_df = df[df["ID_Discussao"] == discussion_id]

                for s_idx, s_row in discussion_df.iterrows():
                    context_speeches.append(
                        f"Candidato {s_row['Candidato']}: \"{s_row['Text'].strip()}\""
                    )

                context_speeches_str = "\n".join(context_speeches)

                q_summary_response = q_summary_chain.invoke(
                    {
                        "context_speeches": context_speeches_str,
                        "question_text": q_row["Text"],
                    }
                )

                summary = q_summary_response.content
                df.loc[idx, "question"] = summary

            return df

        self.speeches = summary_questions(self.speeches)

        # ================================
        # Resumo das Falas
        # ================================
        async def summary_speeches(df: pd.DataFrame) -> pd.DataFrame:
            """
            Gera resumos das falas usando GPT-4o-mini.

            Args:
                df: DataFrame com os speeches.

            Returns:
                DataFrame com resumos das falas.
            """
            s_summary_chain = s_summary_template | init_chat_model(
                model="gpt-4.1-mini", model_provider="openai"
            )

            async def process_row(
                idx: int, row: pd.Series, max_retries: int = 5
            ) -> tuple[int, Optional[str]]:
                """Processa uma linha com retry logic."""
                delay = 1

                for attempt in range(max_retries):
                    try:
                        resp = await s_summary_chain.ainvoke(
                            {"speach_text": row["Text"]}
                        )
                        return idx, resp.content

                    except (RateLimitError, LangChainException) as e:
                        if attempt == max_retries - 1:
                            logger.error(
                                f"[RATE LIMIT] Falha definitiva na linha {idx}"
                            )
                            return idx, None

                        # backoff exponencial com jitter
                        await asyncio.sleep(delay + 0.5)
                        delay *= 2

                    except Exception as e:
                        logger.error(f"[ERRO] Linha {idx}: {e}")
                        return idx, None

            async def process_in_batches(
                df: pd.DataFrame, batch_size: int = 5
            ) -> pd.DataFrame:
                """Processa em batches para melhor performance."""
                for start in tqdm_asyncio(
                    range(0, len(df), batch_size), desc="Processando batches"
                ):
                    end = start + batch_size
                    batch = df.iloc[start:end]

                    tasks = [process_row(idx, row) for idx, row in batch.iterrows()]

                    # Executa batch em paralelo
                    results = await asyncio.gather(*tasks)

                    # Grava resultados no DataFrame
                    for idx, summary in results:
                        df.loc[idx, "summary"] = summary

                return df

            return await process_in_batches(df, batch_size=10)

        self.speeches = await summary_speeches(self.speeches)

        # ===============================
        # Cálculo da Relevância das Respostas
        # ===============================
        class RelevanceAssessment(BaseModel):
            """
            Avalia a relevância de uma resposta em relação a uma pergunta, 
            usando uma escala de 1 a 5.
            """
            
            # Índice da resposta no DataFrame (para reatribuição)
            response_index: int = Field(description="O índice original do DataFrame da fala que é a Resposta.")
            
            # Pontuação de relevância (1 a 5)
            relevance_score: float = Field(
                description="Pontuação de 1.0 (nada relevante) a 5.0 (perfeitamente relevante e focado) sobre o quanto a resposta abordou a pergunta de forma direta.",
                ge=1.0,  # Maior ou igual a 1.0
                le=5.0   # Menor ou igual a 5.0
            )
            
            # Justificativa da pontuação
            justification: str = Field(description="Uma breve justificativa do porquê a pontuação foi dada (Ex: 'O candidato desviou o tema completamente.' ou 'A resposta foi direta e apresentou dados claros.')")

        relevance_finder = init_chat_model(model="gpt-4o-mini", model_provider="openai")
        structured_relevance_finder = relevance_finder.with_structured_output(RelevanceAssessment)
        relevance_chain = relevance_template | structured_relevance_finder


        async def process_relevance_one(
            df: pd.DataFrame, response_index: int
        ) -> Optional[RelevanceAssessment]:
            """
            Busca a pergunta associada e dispara a requisição de avaliação de relevância.

            Args:
                df: DataFrame com os speeches.
                response_index: Índice da resposta a ser avaliada.

            Returns:
                RelevanceAssessment ou None em caso de erro.
            """
            response_row = df.loc[response_index]

            # Garante que é uma resposta válida
            if pd.isna(response_row["question_idx"]):
                return None

            question_index = int(response_row["question_idx"])

            try:
                # Pega o texto da pergunta e da resposta
                question_text = df.loc[question_index, "Text"]
                response_text = response_row["Text"]

                # Invocando o LLM
                response = await relevance_chain.ainvoke(
                    {
                        "question_text": question_text,
                        "response_text": response_text,
                        "response_index": response_index,
                    }
                )

                # O Pydantic garante que a resposta está no formato correto
                return response

            except Exception as e:
                logger.error(
                    f"Erro ao avaliar relevância no índice {response_index}: {e}"
                )
                return None

        async def process_relevance_assessment(
            df: pd.DataFrame,
        ) -> pd.DataFrame:
            """
            Função principal que processa a avaliação de relevância para todas as respostas.

            Args:
                df: DataFrame com os speeches.

            Returns:
                DataFrame com scores de relevância atribuídos.
            """
            # 1. Identifica todos os índices das falas classificadas como respostas
            response_indices = df[df["question_idx"].notna()].index.tolist()

            if not response_indices:
                logger.warning("Nenhuma resposta válida encontrada para avaliação.")
                return df

            logger.info(
                f"Detectadas {len(response_indices)} respostas para avaliação de relevância."
            )

            # 2. Cria e executa as tarefas assíncronas
            tasks = [process_relevance_one(df, index) for index in response_indices]

            # Executa todas as tarefas de forma assíncrona
            results: List[Optional[RelevanceAssessment]] = await tqdm_asyncio.gather(
                *tasks, desc="Avaliando Relevância das Respostas"
            )

            # 3. Mescla os resultados de volta ao DataFrame
            for r in results:
                if r is not None:
                    df.loc[r.response_index, "relevance_score"] = r.relevance_score
                    df.loc[r.response_index, "relevance_justification"] = r.justification

            return df

        self.speeches = await process_relevance_assessment(self.speeches)


    def _get_titulo_eleitoral(self, candidato_nome: str) -> Optional[int]:
        """
        Função auxiliar para obter o Título Eleitoral do Candidato pelo nome.

        Args:
            candidato_nome: Nome do candidato.

        Returns:
            Título eleitoral ou None se não encontrado.
        """
        if self.df_identified is None:
            return None

        titulo_eleitoral = self.df_identified.loc[
            self.df_identified["Candidato"] == candidato_nome, "Titulo_Eleitoral"
        ]
        if len(titulo_eleitoral) > 0:
            return int(titulo_eleitoral.iloc[0])
        return None

    def ingest_discussion_data(self) -> None:
        """
        Ingere os nós de DISCUSSAO e TEMA e os relacionamentos de coerência,
        alvo, e relevância no banco de dados.
        """
        debate_id = self.video_id

        # Prepara o DataFrame para garantir tipos de dados corretos para Cypher
        speeches_df = self.speeches.copy()
        speeches_df = speeches_df.loc[speeches_df["Speech"].notna()]
        speeches_df['ID_Discussao'] = speeches_df['ID_Discussao'].replace({np.nan: None})
        speeches_df['question_idx'] = speeches_df['question_idx'].replace({pd.NA: None, np.nan: None})
        
        with self.database.driver.session() as session:
            logger.info("--- Ingestão de Dados de Discussão ---")

            # 1. INGESTÃO DE NÓS DE AGRUPAMENTO (DISCUSSAO e TEMA)

            # Ingestão de Discussão
            unique_discussion_ids = (
                speeches_df["ID_Discussao"].dropna().unique().tolist()
            )
            if unique_discussion_ids:
                logger.info(
                    f"Ingerindo {len(unique_discussion_ids)} nós de DISCUSSAO..."
                )
                for disc_id in unique_discussion_ids:
                    session.run(
                        """
                        MATCH (d:Debate {debate_id: $debate_id})
                        MERGE (disc:DISCUSSAO {discussion_id: $disc_id})
                        MERGE (d)-[:CONTEM_DISCUSSAO]->(disc)
                        """,
                        {
                            "debate_id": debate_id,
                            "disc_id": f"{debate_id}_{int(disc_id)}",
                        },
                    )
                logger.info("Done")

            # Ingestão de TEMA
            unique_topics = speeches_df["topic"].dropna().unique().tolist()
            if unique_topics:
                logger.info(f"Ingerindo {len(unique_topics)} nós de TEMA...")
                for topic_name in unique_topics:
                    session.run(
                        """
                        MATCH (d:Debate {debate_id: $debate_id})
                        MERGE (t:TEMA {nome: $topic_name})
                        MERGE (d)-[:ABORDOU_TEMA_DEBATE]->(t)
                        """,
                        {"debate_id": debate_id, "topic_name": topic_name},
                    )
                logger.info("Done")

            # 2. INGESTÃO DE RELACIONAMENTOS DINÂMICOS (FALA, PERGUNTA, RESPOSTA)
            logger.info(
                "Ingerindo/Atualizando Speech e Relacionamentos de Discussão..."
            )

            total_speeches = len(speeches_df)

            for idx, row in speeches_df.iterrows():
                # --- PREPARAÇÃO DE VARIÁVEIS ---

                # Cálculo do progresso
                progress = idx / total_speeches * 100
                if idx % 10 == 0:
                    logger.debug(f"Discussion ingestion progress: {progress:.2f}%")

                # ID da Fala
                speech_id = f"{debate_id}_{row['Speech']}"

                # Dados da Resposta e Relevância
                resumo = row.get("summary")
                relevance_score = (
                    float(row.get("relevance_score"))
                    if pd.notna(row.get("relevance_score"))
                    else None
                )
                relevance_justification = row.get("relevance_justification")
                if row["question_idx"] not in speeches_df.index:
                    question_idx = None
                else:
                    question_idx = (
                        int(speeches_df.loc[row["question_idx"], "Speech"])
                        if pd.notna(row["question_idx"]) and row.get("question_idx") is not None
                        else None
                    )
                question_speech_id = (
                    f"{debate_id}_{question_idx}" if question_idx is not None else None
                )

                # Dados de Tópico e Discussão
                topic = row.get("topic")
                disc_id = (
                    f"{debate_id}_{int(row.get('ID_Discussao'))}"
                    if row.get("ID_Discussao") is not None
                    else None
                )

                # ID da Pergunta (É o mesmo ID do Speech que a contém)
                pergunta_id = speech_id if row.get("is_question") else None

                # --- CONSTRUÇÃO DA QUERY CYPHER ---

                # Atualiza o nó Speech com as novas propriedades de Relevância e Tópico.
                # Usa f-strings condicionais para incluir cláusulas apenas se os dados existirem.

                cypher_query = f"""
                    // 1. MATCH NÓS BÁSICOS
                    MATCH (s:Speech {{speech_id: $speech_id}})
                    SET s.relevance_score = $relevance_score, 
                        s.relevance_justification = $relevance_justification,
                        s.resumo = $summary,
                        s.question = $question
                    
                    // 2. RELACIONAMENTO ESTRUTURAL (Discussão)
                    {f'WITH s MATCH (disc:DISCUSSAO {{discussion_id: $disc_id}}) MERGE (s)-[:FAZ_PARTE_DE]->(disc)' if disc_id is not None else ''}

                    // 3. RELACIONAMENTO DE TEMA (O Speech aborda um TEMA)
                    {f'WITH s MATCH (t:TEMA {{nome: $topic}}) MERGE (s)-[:ABORDOU_TEMA]->(t)' if topic else ''}

                    // 5. LÓGICA DE RESPOSTA (Se a fala tem question_idx)
                    {f'''
                    WITH s
                    MATCH (pergunta_speech:Speech {{speech_id: $question_speech_id}})
                    // Cria o relacionamento de Resposta com propriedades de relevância
                    MERGE (s)-[:RESPONDEU_A {{score: $relevance_score, justification: $relevance_justification}}]->(pergunta_speech)
                    ''' if question_idx is not None and question_speech_id else ''}
                """

                # --- EXECUÇÃO DA QUERY ---

                session.run(
                    cypher_query,
                    {
                        "speech_id": speech_id,
                        "relevance_score": relevance_score,
                        "relevance_justification": relevance_justification,
                        "disc_id": disc_id,
                        "topic": topic,
                        "pergunta_id": pergunta_id,
                        "question_speech_id": question_speech_id,
                        "question": row.get("question"),
                        "summary": resumo,
                    },
                )

            logger.info("Ingestão de dados de Discussão concluída.")
    
    def _manual_assign_speakers(self, df_dia: pd.DataFrame) -> pd.DataFrame:
        """
        Permite que o usuário associe manualmente Speaker_ID → Candidato,
        exibindo timestamps para auxiliar a identificação.
        """

        print("\n=== IDENTIFICAÇÃO MANUAL DE SPEAKERS ===\n")
        print("Candidatos disponíveis:")
        for c in self.result_candidatos:
            print(f" - {c}")
        print(" - n  (não é candidato)\n")

        speaker_map = {}

        for speaker_id in sorted(df_dia["Speaker_ID"].unique()):
            # Selecionar trechos desse speaker
            df_spk = df_dia[df_dia["Speaker_ID"] == speaker_id]

            print("\n" + "=" * 60)
            print(f"Speaker_ID: {speaker_id}")
            print("Trechos associados (timestamps):")

            # Mostrar apenas alguns exemplos para não poluir o terminal
            for _, row in df_spk.head(5).iterrows():
                inicio = row["Diarizacao_Start"]
                fim = row["Diarizacao_End"]
                print(f"  - {inicio} → {fim}")

            if len(df_spk) > 5:
                print(f"  ... (+{len(df_spk) - 5} trechos)")

            while True:
                sys.stdout.flush()

                nome = input(
                    "\nDigite o nome do candidato exatamente como listado "
                    "(ou 'n' se não for candidato): "
                ).strip()

                if nome in self.result_candidatos:
                    speaker_map[speaker_id] = nome
                    break
                elif nome.lower() == "n":
                    speaker_map[speaker_id] = None
                    break
                else:
                    print("❌ Nome inválido. Tente novamente.")

        # Aplicar mapeamento
        df_dia["Candidato"] = df_dia["Speaker_ID"].map(speaker_map)
        df_dia["Titulo_Eleitoral"] = df_dia["Candidato"].map(self.result_documentos)

        return df_dia
