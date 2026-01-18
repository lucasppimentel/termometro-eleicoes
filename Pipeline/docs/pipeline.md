# Overview

The project’s data pipeline is the component responsible for **ETL**.  
It consists of a Python-based file structure, heavily using AI — sometimes implemented in the simplest possible way, but functional most of the time.

---

## 📁 Project Structure

Project structure:

    .
    ├── Database
    │   └── Candidates
    │       └── **.csv
    ├── Downloads
    │   └── [video_id]
    │       ├── **.pkl
    │       └── video.wav
    ├── src
    │   ├── database.py
    │   ├── debate_processer.py
    │   ├── my_utils.py
    │   └── prompts.py.py
    ├── .env
    ├── .gitignore
    ├── main.ipynb
    └── requirements.txt

Directory description:

- **Database**: contains `.csv` files with public datasets about candidates and elections.
- **Downloads**: folder containing downloaded YouTube videos and several `.pkl` files with intermediate data (transcriptions, dataframes with identified candidates in the videos, etc.).
- **src**: `.py` files with function and class definitions used in the pipeline.
- **main.ipynb**: notebook that runs the pipeline in stages.

---

## 🔄 Pipeline Steps (ETL)

1. Download audio from YouTube  
2. Generate video transcription  
3. Extract basic information  
4. Identify participants  
5. Diarization  
6. Speech classification  
7. Proposal identification  
8. Discussion calculation  
9. Database ingestion  

---

## 🎧 Download YouTube Audio

The audio, metadata, description, and title are downloaded using the **yt_dlp** library.

---

## 📝 Generate Audio Transcription

Transcription is performed using **Whisper**.

Important note:  
YouTube already generates automatic transcriptions, but they are of low quality.  
Moreover, YouTube has no official API for downloading transcriptions, and available alternatives are unreliable.  
Thus, Whisper was adopted as the simplest and most robust solution.

The transcription produces a **DataFrame** with the following columns:

- `text`: the spoken segment  
- `start`: start time (in seconds)  
- `end`: end time (in seconds)  

---

## 🔎 Extract Basic Information

This step extracts the following:

- Position  
- State  
- Municipality  
- Year  

It is done via an **API call to the GPT-5 Mini model**, using video metadata and approximately **20 minutes of transcription**.

---

## 🧑‍🤝‍🧑 Identify Participants

Participant identification is performed with a **call to GPT-4.1**, using a transcription snippet.

### Example LLM Output

Transcription segment:

    "Thank you for this opportunity. As Candidate A, my focus has always been on job creation and improving the economy."

Identified segment:

- **Speaker**: Candidate A  
- **Text**: "Thank you for this opportunity. As Candidate A, my focus has always been on job creation and improving the economy."

After parsing the LLM output, an object is generated in this format:

    [
      {
        "Speaker": "Candidate A",
        "Text": "Thank you for this opportunity…"
      }
    ]

---

### Handling Inconsistencies (Fuzzy Search)

Since the LLM can:

- Misidentify names  
- Misspell names (e.g., *Victor Silva* vs *Vitor Silva*)  
- Return unexpected formats  
- Slightly modify the text  

Techniques of **fuzzy searching / approximate search** are applied to:

- Correctly identify the candidate in the database (considering state and position)  
- Find the correct segment in the original transcription

This step serves as a layer to mitigate LLM errors.

### Step Output

A **transcription DataFrame** with two additional columns:

- `Candidate`  
- `Voter_Title`  

These columns identify the candidate in the segments recognized by the LLM.

---

## 🎙️ Diarization

At this point, we have:

- The complete transcription  
- At least one segment per candidate where we know who is speaking

However, we cannot rely on an LLM to identify **all segments**, because many do not explicitly indicate the speaker.

Diarization is used here.

### What is Diarization?

Diarization is the process of identifying different **speakers** in audio, segmenting the recording by voice — without naming the speaker.

The image below represents the output of this process.

![Diarization Output Example](Pipeline\docs\images\diarization.png)

The output is a **DataFrame** with:

- `speaker_id`  
- `start`  
- `end`  

---

### Aligning Diarization × Transcription

The timestamps of diarization and transcription **do not perfectly align**.

Association is done as follows:

- For each `speaker_id`, compute the overlap with already identified transcription segments  
- The candidate with the **highest overlap** is assigned to the speaker

Example:

The image below is an example of outputs of transcription and diarization one over the other.

![Diarization x Transcription](Pipeline\docs\images\allignment.png)

- Speaker 1 has the highest overlap with Candidate A segments  
- Speaker 1 is identified as Candidate A  

---

### Speeches

After speakers are identified, speeches are calculated as **groups of consecutive segments** by the same candidate.

Step output: a DataFrame with columns:

- `text`  
- `start`  
- `end`  
- `voter_title`  

---

## 🗂️ Speech Classification and Proposal Identification

### Proposal Identification

Proposal identification iterates a **SLM** over the speech DataFrame.  
The output is a list of proposals for each candidate’s speech.

---

### Speech Classification (Deprecated)

Speech classification used a **zero-shot** strategy with the model:

- `xlm-roberta-large-xnli`

Categories were:

- Proposal  
- Attack  
- Defense  
- Provocation  
- Emotional appeal  
- Appeal to authority  
- Evasion or dodging  
- Indirect attack  
- Self-promotion  

Currently, this classification **is no longer used**, as it did not prove relevant for the project.  
The code remains in the repository.

---

## 🧠 Discussion Calculation

At this point, we know:

- Who is speaking  
- What each candidate said  

However, **context** is missing.

In a debate, speeches occur as **discussions**:  
someone asks a question, another responds, interruptions happen, comments are made — generally around a **common topic**.

### Process

1. Identify questions  
   - Using a **SLM** on the speech DataFrame

2. Associate speeches with questions  
   - For each question, a SLM evaluates the **next 5 speeches**  
   - The LLM indicates which are part of the same discussion

   The following image represents the expected output.

    ![Speaches Association](Pipeline\docs\images\grouping_1.png)

3. Group discussions  
   - Relationships are modeled as a graph  
   - Final grouping is done with **NetworkX**

   The image below shows the expected output.
    ![Speaches Association](Pipeline\docs\images\grouping_2.png)


---

## 🗄️ Database Ingestion

Finally, the processed data is ingested into a **graph database**, where:

- Speeches, candidates, and discussions are represented as **nodes**  
- Interactions and relations are represented as **edges**
