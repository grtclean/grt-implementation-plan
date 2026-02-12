# GRT System - AI/ML Modules Installation Guide

**Version:** 1.0  
**Date:** 2026-02-06  
**Target:** Windows 11 Local Development Environment

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [LLM Integration](#llm-integration)
3. [Vector Databases](#vector-databases)
4. [Machine Learning Frameworks](#machine-learning-frameworks)
5. [Data Processing](#data-processing)
6. [Computer Vision](#computer-vision)
7. [Natural Language Processing](#natural-language-processing)
8. [Monitoring and Logging](#monitoring-and-logging)
9. [Development Environment](#development-environment)
10. [Integration with GRT System](#integration-with-grt-system)

---

## Prerequisites

### System Requirements

```powershell
# Check Python version (3.9+)
python --version

# Check pip
pip --version

# Create virtual environment (recommended)
python -m venv grt_ai_env
.\grt_ai_env\Scripts\Activate.ps1
```

### Install Base Dependencies

```bash
pip install --upgrade pip setuptools wheel
pip install python-dotenv
```

---

## LLM Integration

### 1. OpenAI API

**Installation:**
```bash
pip install openai
```

**Configuration (.env):**
```
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_TEMPERATURE=0.7
```

**Basic Usage:**
```python
from openai import OpenAI

client = OpenAI(api_key="sk-...")

response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello!"}
    ]
)

print(response.choices[0].message.content)
```

**Cost Monitoring:**
- [ ] Set up usage alerts
- [ ] Monitor API calls
- [ ] Implement rate limiting
- [ ] Track token usage

### 2. Google Gemini API

**Installation:**
```bash
pip install google-generativeai
```

**Configuration (.env):**
```
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-pro
```

**Basic Usage:**
```python
import google.generativeai as genai

genai.configure(api_key="...")

model = genai.GenerativeModel('gemini-pro')
response = model.generate_content("Hello!")

print(response.text)
```

### 3. LangChain

**Installation:**
```bash
pip install langchain langchain-community langchain-openai
```

**Configuration:**
```python
from langchain_openai import ChatOpenAI
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate

llm = ChatOpenAI(
    model="gpt-4",
    temperature=0.7,
    api_key="sk-..."
)

# Create a chain
prompt = PromptTemplate(
    input_variables=["topic"],
    template="Tell me about {topic}"
)

chain = LLMChain(llm=llm, prompt=prompt)
result = chain.run(topic="AI")
```

**Advanced Features:**
- [ ] Memory management
- [ ] Tool integration
- [ ] Agent creation
- [ ] Chain composition

### 4. LlamaIndex (RAG)

**Installation:**
```bash
pip install llama-index llama-index-readers-file
```

**Configuration:**
```python
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.llms.openai import OpenAI

# Load documents
documents = SimpleDirectoryReader("./data").load_data()

# Create index
index = VectorStoreIndex.from_documents(documents)

# Query
query_engine = index.as_query_engine()
response = query_engine.query("What is the main topic?")
```

**Features:**
- [ ] Document ingestion
- [ ] Indexing
- [ ] Retrieval
- [ ] Query engines

---

## Vector Databases

### 1. Pinecone (Cloud-Based)

**Installation:**
```bash
pip install pinecone-client
```

**Setup:**
```python
from pinecone import Pinecone

pc = Pinecone(api_key="your-api-key")
index = pc.Index("index-name")

# Upsert vectors
index.upsert(vectors=[
    ("id1", [0.1, 0.2, 0.3]),
    ("id2", [0.4, 0.5, 0.6])
])

# Query
results = index.query(vector=[0.1, 0.2, 0.3], top_k=10)
```

**Configuration (.env):**
```
PINECONE_API_KEY=your-api-key
PINECONE_INDEX_NAME=grt-index
PINECONE_ENVIRONMENT=us-west1-gcp
```

### 2. Weaviate (Open Source)

**Installation:**
```bash
pip install weaviate-client
```

**Docker Setup:**
```bash
docker run -d \
  -p 8080:8080 \
  -p 50051:50051 \
  semitechnologies/weaviate:latest
```

**Usage:**
```python
import weaviate

client = weaviate.Client("http://localhost:8080")

# Create schema
schema = {
    "classes": [{
        "name": "Document",
        "properties": [
            {"name": "content", "dataType": ["text"]}
        ]
    }]
}

client.schema.create(schema)
```

### 3. Milvus (Open Source)

**Installation:**
```bash
pip install pymilvus
```

**Docker Setup:**
```bash
docker-compose up -d
```

**Usage:**
```python
from pymilvus import Collection, connections

connections.connect("default", host="localhost", port=19530)

collection = Collection("documents")

# Insert vectors
collection.insert([[1, 2, 3], [4, 5, 6]])

# Search
results = collection.search([[1, 2, 3]], "embedding", limit=10)
```

---

## Machine Learning Frameworks

### 1. TensorFlow

**Installation:**
```bash
pip install tensorflow

# With GPU support (CUDA 11.8)
pip install tensorflow[and-cuda]
```

**Basic Usage:**
```python
import tensorflow as tf

# Create model
model = tf.keras.Sequential([
    tf.keras.layers.Dense(128, activation='relu'),
    tf.keras.layers.Dense(10, activation='softmax')
])

model.compile(optimizer='adam', loss='sparse_categorical_crossentropy')
model.fit(x_train, y_train, epochs=10)
```

**GPU Check:**
```python
print(tf.config.list_physical_devices('GPU'))
```

### 2. PyTorch

**Installation:**
```bash
pip install torch torchvision torchaudio

# With CUDA 12.1
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

**Basic Usage:**
```python
import torch
import torch.nn as nn

# Create model
model = nn.Sequential(
    nn.Linear(784, 128),
    nn.ReLU(),
    nn.Linear(128, 10)
)

# Training
optimizer = torch.optim.Adam(model.parameters())
loss_fn = nn.CrossEntropyLoss()
```

**GPU Check:**
```python
print(torch.cuda.is_available())
print(torch.cuda.get_device_name(0))
```

### 3. Scikit-learn

**Installation:**
```bash
pip install scikit-learn
```

**Usage:**
```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y)

# Train model
model = RandomForestClassifier(n_estimators=100)
model.fit(X_train, y_train)

# Evaluate
score = model.score(X_test, y_test)
```

### 4. XGBoost

**Installation:**
```bash
pip install xgboost
```

**Usage:**
```python
import xgboost as xgb

# Create model
model = xgb.XGBClassifier(
    n_estimators=100,
    max_depth=5,
    learning_rate=0.1
)

model.fit(X_train, y_train)
predictions = model.predict(X_test)
```

---

## Data Processing

### 1. Pandas

**Installation:**
```bash
pip install pandas
```

**Common Operations:**
```python
import pandas as pd

# Load data
df = pd.read_csv("data.csv")

# Data manipulation
df['new_column'] = df['column1'] + df['column2']
df_filtered = df[df['value'] > 100]

# Aggregation
grouped = df.groupby('category').sum()

# Export
df.to_csv("output.csv")
```

### 2. NumPy

**Installation:**
```bash
pip install numpy
```

**Usage:**
```python
import numpy as np

# Create arrays
arr = np.array([1, 2, 3, 4, 5])
matrix = np.zeros((3, 3))

# Operations
result = np.dot(matrix, arr)
stats = np.mean(arr), np.std(arr)
```

### 3. Polars

**Installation:**
```bash
pip install polars
```

**Usage:**
```python
import polars as pl

# Load data
df = pl.read_csv("data.csv")

# Lazy evaluation
result = (
    df.lazy()
    .filter(pl.col("value") > 100)
    .groupby("category")
    .agg(pl.col("value").sum())
    .collect()
)
```

---

## Computer Vision

### 1. OpenCV

**Installation:**
```bash
pip install opencv-python opencv-contrib-python
```

**Basic Usage:**
```python
import cv2

# Read image
img = cv2.imread("image.jpg")

# Process
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
edges = cv2.Canny(gray, 100, 200)

# Display
cv2.imshow("Edges", edges)
cv2.waitKey(0)
```

### 2. YOLOv8

**Installation:**
```bash
pip install ultralytics
```

**Usage:**
```python
from ultralytics import YOLO

# Load model
model = YOLO("yolov8n.pt")

# Detect
results = model("image.jpg")

# Process results
for r in results:
    print(r.boxes)
```

### 3. MediaPipe

**Installation:**
```bash
pip install mediapipe
```

**Pose Detection:**
```python
import mediapipe as mp

mp_pose = mp.solutions.pose
pose = mp_pose.Pose()

# Process image
results = pose.process(image)

# Get landmarks
if results.pose_landmarks:
    for landmark in results.pose_landmarks.landmark:
        print(landmark.x, landmark.y, landmark.z)
```

---

## Natural Language Processing

### 1. Hugging Face Transformers

**Installation:**
```bash
pip install transformers torch
```

**Usage:**
```python
from transformers import pipeline

# Sentiment analysis
classifier = pipeline("sentiment-analysis")
result = classifier("I love this!")

# Question answering
qa = pipeline("question-answering")
answer = qa(question="What is AI?", context="AI is...")
```

### 2. spaCy

**Installation:**
```bash
pip install spacy

# Download model
python -m spacy download en_core_web_sm
```

**Usage:**
```python
import spacy

nlp = spacy.load("en_core_web_sm")
doc = nlp("Apple is looking at buying U.K. startup")

# Named entity recognition
for ent in doc.ents:
    print(ent.text, ent.label_)
```

### 3. NLTK

**Installation:**
```bash
pip install nltk

# Download data
python -m nltk.downloader punkt averaged_perceptron_tagger
```

**Usage:**
```python
import nltk
from nltk.tokenize import word_tokenize

text = "Hello world!"
tokens = word_tokenize(text)
pos_tags = nltk.pos_tag(tokens)
```

---

## Monitoring and Logging

### 1. Weights & Biases

**Installation:**
```bash
pip install wandb
```

**Setup:**
```python
import wandb

wandb.init(project="grt-system", entity="your-entity")

# Log metrics
wandb.log({"loss": 0.5, "accuracy": 0.95})

# Log model
wandb.save("model.pth")
```

### 2. MLflow

**Installation:**
```bash
pip install mlflow
```

**Setup:**
```python
import mlflow

mlflow.start_run()

# Log parameters
mlflow.log_param("learning_rate", 0.01)

# Log metrics
mlflow.log_metric("accuracy", 0.95)

# Log model
mlflow.sklearn.log_model(model, "model")

mlflow.end_run()
```

**UI:**
```bash
mlflow ui
# Visit http://localhost:5000
```

### 3. TensorBoard

**Installation:**
```bash
pip install tensorboard
```

**Usage:**
```python
from torch.utils.tensorboard import SummaryWriter

writer = SummaryWriter()

# Log scalars
writer.add_scalar('Loss/train', loss, epoch)

# View
# tensorboard --logdir=runs
```

---

## Development Environment

### 1. Jupyter Notebook

**Installation:**
```bash
pip install jupyter notebook ipykernel
```

**Launch:**
```bash
jupyter notebook
```

**Create Kernel:**
```bash
python -m ipykernel install --user --name grt_ai --display-name "GRT AI"
```

### 2. Conda

**Installation:**
```powershell
# Download from https://www.anaconda.com
# Or use Miniconda (lighter)
```

**Usage:**
```bash
# Create environment
conda create -n grt_ai python=3.11

# Activate
conda activate grt_ai

# Install packages
conda install numpy pandas scikit-learn

# Export environment
conda env export > environment.yml
```

### 3. Docker

**Installation:**
```powershell
# Download from https://www.docker.com
```

**Dockerfile:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["python", "app.py"]
```

**Build and Run:**
```bash
docker build -t grt-ai .
docker run -p 8000:8000 grt-ai
```

---

## Integration with GRT System

### 1. Server-Side Integration

**File: `server/routers/ai.router.ts`**

```typescript
import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";

export const aiRouter = router({
  generateSolution: publicProcedure
    .input(z.object({
      requirements: z.string(),
      context: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a GRT system solution assistant."
          },
          {
            role: "user",
            content: `Requirements: ${input.requirements}\nContext: ${input.context}`
          }
        ]
      });
      return response;
    }),
});
```

### 2. Frontend Integration

**File: `client/src/pages/AIAssistant.tsx`**

```typescript
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function AIAssistant() {
  const [requirements, setRequirements] = useState("");
  const generateMutation = trpc.ai.generateSolution.useMutation();

  const handleGenerate = async () => {
    const result = await generateMutation.mutateAsync({
      requirements,
      context: "GRT industrial system"
    });
    console.log(result);
  };

  return (
    <div>
      <textarea
        value={requirements}
        onChange={(e) => setRequirements(e.target.value)}
        placeholder="Enter requirements..."
      />
      <button onClick={handleGenerate}>
        {generateMutation.isPending ? "Generating..." : "Generate Solution"}
      </button>
    </div>
  );
}
```

### 3. Environment Configuration

**File: `.env`**

```
# LLM Configuration
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...

# Vector Database
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=grt-index

# Monitoring
WANDB_API_KEY=...

# Database
DATABASE_URL=mysql://user:password@localhost:3306/grt_system
```

---

## Installation Checklist

### Phase 1: Base Setup
- [ ] Python 3.11+ installed
- [ ] Virtual environment created
- [ ] pip upgraded

### Phase 2: LLM Integration
- [ ] OpenAI SDK installed
- [ ] API key configured
- [ ] LangChain installed
- [ ] LlamaIndex installed

### Phase 3: Vector Databases
- [ ] Vector DB client installed
- [ ] Connection tested
- [ ] Index created

### Phase 4: ML Frameworks
- [ ] TensorFlow or PyTorch installed
- [ ] GPU support verified
- [ ] Scikit-learn installed
- [ ] XGBoost installed

### Phase 5: Data Processing
- [ ] Pandas installed
- [ ] NumPy installed
- [ ] Polars installed

### Phase 6: Computer Vision
- [ ] OpenCV installed
- [ ] YOLOv8 installed
- [ ] MediaPipe installed

### Phase 7: NLP
- [ ] Transformers installed
- [ ] spaCy installed
- [ ] NLTK installed

### Phase 8: Monitoring
- [ ] Weights & Biases configured
- [ ] MLflow running
- [ ] TensorBoard configured

### Phase 9: Development
- [ ] Jupyter Notebook running
- [ ] Conda environment created
- [ ] Docker configured

---

## Troubleshooting

### Issue: CUDA Not Found

```bash
# Check CUDA installation
nvidia-smi

# Install CUDA toolkit
# https://developer.nvidia.com/cuda-downloads

# Verify PyTorch CUDA
python -c "import torch; print(torch.cuda.is_available())"
```

### Issue: Memory Issues

```bash
# Reduce batch size
# Use gradient accumulation
# Enable mixed precision training

import torch
from torch.cuda.amp import autocast

with autocast():
    output = model(input)
```

### Issue: API Rate Limits

```python
import time
from functools import wraps

def rate_limit(calls_per_second=1):
    min_interval = 1.0 / calls_per_second
    last_called = [0.0]
    
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            elapsed = time.time() - last_called[0]
            wait_time = min_interval - elapsed
            if wait_time > 0:
                time.sleep(wait_time)
            result = func(*args, **kwargs)
            last_called[0] = time.time()
            return result
        return wrapper
    return decorator
```

---

## Next Steps

1. Install prerequisites
2. Set up virtual environment
3. Install LLM integration modules
4. Configure API keys
5. Test with sample scripts
6. Integrate with GRT system
7. Monitor and optimize

---

**Last Updated:** 2026-02-06  
**Maintained By:** GRT Development Team
