# Utils
import subprocess
import datetime
import time
from thefuzz import process
import random

# AI
import whisper

# Data
from sentence_transformers import util
import torch

import yt_dlp
import os

def extract_video_info(video_url_or_id, cookies_file=None, cookies_from_browser=None):
    """
    Extrai o título, a descrição e a data de publicação de um vídeo do YouTube.

    Args:
        video_url_or_id (str): O URL completo do vídeo do YouTube ou apenas o ID do vídeo.
        cookies_file (str, optional): Caminho para um arquivo de cookies (formato Netscape).
        cookies_from_browser (str, optional): Nome do navegador para extrair cookies automaticamente.
                                            Exemplos: 'chrome', 'firefox', 'edge', 'safari', etc.
                                            Pode incluir perfil: 'chrome:Profile 1' ou 'firefox:default'

    Returns:
        dict: Um dicionário contendo 'title', 'description' e 'upload_date'
              do vídeo, ou None em caso de erro.
    """
    # Constrói a URL completa se apenas o ID foi fornecido
    if not video_url_or_id.startswith('http'):
        video_url = f"https://www.youtube.com/watch?v={video_url_or_id}"
    else:
        video_url = video_url_or_id
    
    # Verifica variáveis de ambiente para cookies se não fornecidos explicitamente
    if cookies_file is None:
        cookies_file = os.getenv('YOUTUBE_COOKIES_FILE')
    if cookies_from_browser is None:
        cookies_from_browser = os.getenv('YOUTUBE_COOKIES_FROM_BROWSER')
    
    ydl_opts = {
        'skip_download': True,  # Apenas extrai metadados, não baixa o vídeo
        'quiet': True,          # Suprime a saída do console
    }
    
    # Adiciona suporte a cookies se fornecido
    if cookies_file:
        ydl_opts['cookiefile'] = cookies_file
    elif cookies_from_browser:
        # Parse do formato do navegador (ex: 'chrome' ou 'chrome:Profile 1')
        browser_parts = cookies_from_browser.split(':')
        browser_name = browser_parts[0]
        profile = browser_parts[1] if len(browser_parts) > 1 else None
        ydl_opts['cookiesfrombrowser'] = (browser_name, profile) if profile else (browser_name,)

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(video_url, download=False)
            
            # Pega as informações do dicionário
            title = info_dict.get('title', 'Título não encontrado')
            description = info_dict.get('description', 'Descrição não encontrada')
            upload_date_str = info_dict.get('upload_date', 'Data não encontrada')
            
            # Formata a data se ela for encontrada
            formatted_date = None
            if upload_date_str != 'Data não encontrada':
                # Converte 'YYYYMMDD' para um objeto de data
                upload_date_obj = datetime.datetime.strptime(upload_date_str, '%Y%m%d').date()
                # Formata a data para 'DD/MM/YYYY'
                formatted_date = upload_date_obj.strftime('%d/%m/%Y')
            
            return {
                'title': title,
                'description': description,
                'upload_date': formatted_date if formatted_date else upload_date_str
            }
    except Exception as e:
        print(f"Ocorreu um erro: {e}")
        return None

def best_match_with_splits(speaker_row, transcript_df, threshold=0.7):
    """
    Encontra o melhor match entre um trecho longo (dividido em sentenças)
    e os segmentos do transcript.
    """
    best_idx, best_score = None, 0.0
    
    for sub_emb in speaker_row["sub_embeddings"]:
        cos_sims = util.cos_sim(sub_emb, torch.stack(transcript_df["embedding"].to_list()))[0]
        idx = torch.argmax(cos_sims).item()
        score = cos_sims[idx].item()
        
        if score > best_score:
            best_score, best_idx = score, idx

    if best_score >= threshold:
        return best_idx, best_score
    return None, best_score

def download_audio(
    video_url, 
    output_path="audio.%(ext)s", 
    max_retries=3, 
    cookies_file=None,
    cookies_from_browser=None
):
    """
    Downloads the best available audio from a YouTube video using yt-dlp,
    converting it automatically to M4A.

    Args:
        video_url (str): YouTube video URL.
        output_path (str): Template for output file (use %(ext)s for dynamic extension).
        max_retries (int): Number of retries.
        cookies_file (str, optional): Path to a cookies.txt file.
        cookies_from_browser (str, optional): Nome do navegador para extrair cookies automaticamente.
                                            Exemplos: 'chrome', 'firefox', 'edge', 'safari', etc.
    """

    # Verifica variáveis de ambiente para cookies se não fornecidos explicitamente
    if cookies_file is None:
        cookies_file = os.getenv('YOUTUBE_COOKIES_FILE')
    if cookies_from_browser is None:
        cookies_from_browser = os.getenv('YOUTUBE_COOKIES_FROM_BROWSER')

    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ]

    # Safe format selector:
    # - Prefer AAC audio (m4a)
    # - Otherwise fallback to ANY best audio
    format_selector = "bestaudio[acodec^=mp4a]/bestaudio/best"

    # Base yt-dlp options
    base_opts = {
        "format": format_selector,
        "outtmpl": output_path,
        "noplaylist": True,
        "cookiefile": cookies_file,
        "user_agent": None,  # assigned dynamically on each attempt
        "referer": "https://www.youtube.com/",
        "socket_timeout": 30,
        "quiet": False,

        # Convert audio output to m4a automatically
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "m4a",
                "preferredquality": "192",
            }
        ],
    }
    
    # Adiciona suporte a cookies do navegador se fornecido
    if cookies_from_browser and not cookies_file:
        # Parse do formato do navegador (ex: 'chrome' ou 'chrome:Profile 1')
        browser_parts = cookies_from_browser.split(':')
        browser_name = browser_parts[0]
        profile = browser_parts[1] if len(browser_parts) > 1 else None
        base_opts['cookiesfrombrowser'] = (browser_name, profile) if profile else (browser_name,)

    for attempt in range(1, max_retries + 1):
        print(f"\nAttempt {attempt}/{max_retries}")

        # Rotate user-agent
        base_opts["user_agent"] = random.choice(user_agents)

        try:
            with yt_dlp.YoutubeDL(base_opts) as ydl:
                ydl.download([video_url])

            # Resolve the actual written file (because of %(ext)s)
            dirname = os.path.dirname(output_path) or "."
            basename = os.path.basename(output_path).replace("%(ext)s", "")
            
            # Find files that match the output pattern
            candidates = [
                os.path.join(dirname, f)
                for f in os.listdir(dirname)
                if f.startswith(basename)
            ]

            if not candidates:
                print(f"⚠ No output file found matching pattern: {basename}")
                continue

            downloaded_file = max(candidates, key=os.path.getmtime)
            size = os.path.getsize(downloaded_file)

            if size == 0:
                print(f"⚠ File downloaded but empty: {downloaded_file}")
                os.remove(downloaded_file)
                continue

            print(f"✅ Audio downloaded: {downloaded_file} ({size} bytes)")
            return downloaded_file

        except yt_dlp.utils.DownloadError as e:
            print(f"❌ yt-dlp error: {e}")

        except Exception as e:
            print(f"❌ Unexpected error: {e}")

        # Wait before next retry
        if attempt < max_retries:
            wait = min(attempt * 5, 20)
            print(f"⏳ Retrying in {wait} seconds...")
            time.sleep(wait)

    raise Exception("Failed to download audio after all retry attempts.")


def create_path(path):
    """Cria um diretório se ele não existir."""

    try:
        os.mkdir(path)
        print(f"Directory '{path}' created successfully.")
    except FileExistsError:
        print(f"Directory '{path}' already exists.")

def convert_folder_video_to_wav(folder_path):
    """
    Converte o arquivo de vídeo dentro de uma pasta para WAV.
    
    Procura por 'video.mp4' ou 'video.webm' dentro da pasta e cria 'audio.wav'.
    
    Args:
        folder_path (str): Caminho da pasta que contém o vídeo.
    
    Returns:
        str: Caminho do arquivo WAV gerado.
    """
    if not os.path.isdir(folder_path):
        raise NotADirectoryError(f"Pasta não encontrada: {folder_path}")
    
    # Checar se a pasta já contém o video em .wav
    wav_path = folder_path+f'/{"video.wav"}'
    if os.path.exists(wav_path):
        return folder_path+f'/{"video.wav"}'

    # Procurar pelo arquivo de vídeo
    video_file = None
    for ext in ['.m4a', '.webm', '', '.mp4']:
        candidate = folder_path+f'/{"video"+ext}'
        if os.path.exists(candidate):
            video_file = candidate
            break
    
    if video_file is None:
        raise FileNotFoundError("Não foi encontrado um arquivo 'video.mp4' ou 'video.webm' na pasta.")
    
    # Caminho de saída do WAV
    wav_file = os.path.join(folder_path, "audio.wav")
    
    # Converter usando FFmpeg
    cmd = [
        "ffmpeg",
        "-y",
        "-i", video_file,
        "-ac", "1",        # mono
        "-ar", "16000",    # 16kHz
        "-sample_fmt", "s16",  # 16-bit PCM
        wav_file
    ]
    subprocess.run(cmd, check=True)
    
    return wav_file

def transcribe_with_whisper(folder_path, model_size="small"):
    """
    Converte vídeo da pasta para WAV e faz a transcrição usando Whisper small.
    Retorna uma lista de segmentos com start, end e texto.
    """
    # Converter vídeo para WAV
    audio_path = convert_folder_video_to_wav(folder_path)
    
    # Carregar modelo Whisper
    print(f"Carregando modelo Whisper ({model_size})...")
    model = whisper.load_model(model_size)
    
    # Fazer a transcrição
    print("Iniciando transcrição...")
    result = model.transcribe(audio_path, language="pt", word_timestamps=False, verbose=True)
    
    # result["segments"] contém a lista de segmentos com timestamps
    segments = []
    if "segments" in result:
        for seg in result["segments"]:
            segments.append({
                "start": seg["start"],
                "end": seg["end"],
                "text": seg["text"]
            })
    
    print("Transcrição completa!")
    return segments

def normalize_scores(scores):
    return[
        (float(i) - min(scores))/
        (max(scores) - min(scores)) \
        for i in scores]


def find_best_match(valor:str, valores_possiveis:str, score_threshold:int = 70):
    """
    Encontra a melhor correspondência de uma string dentro de uma lista de strings.
    Exemplo: Prefeito -> PREFEITO

    Args:
        valor (str): O valor a ser buscado (ex: "Prefeito").
        valores_possiveis (list): Lista dos valores possíveis para correspondência.
        score_threshold (int): Pontuação mínima de similaridade (0-100) para uma
                               correspondência válida.

    Returns:
        str: A string da lista que mais se assemelha ao valor, ou None.
    """
    # A função `extractOne` da biblioteca `thefuzz` busca a melhor
    # correspondência. Ela retorna uma tupla: (melhor_correspondência, pontuação).
    best_match = process.extractOne(valor.upper(), valores_possiveis)

    if best_match and best_match[1] >= score_threshold:
        return best_match[0]  # Retorna o cargo com a melhor pontuação
    else:
        print(f"Nenhuma correspondência válida encontrada para '{valor}'.")
        return None