# app.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd
import numpy as np

app = FastAPI(title="API de Classificação de Exoplanetas", version="2.4.1")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

try:
    file_path = 'saved_model/best_exoplanet_classifier.joblib'
    model_artifacts = joblib.load(file_path)
    model = model_artifacts['model']
    model_columns = model_artifacts['columns']
    scaler = model_artifacts['scaler']
    class_map = {0: 'CANDIDATE', 1: 'CONFIRMED', 2: 'FALSE POSITIVE'}
    print("✅ Modelo, colunas e scaler carregados com sucesso!")
except Exception as e:
    model = None
    print(f"❌ ERRO ao carregar artefatos do modelo: {e}")

@app.get("/")
def read_root(): return {"status": "API online"}

@app.post("/predict")
def predict(data: dict):
    if not model: return {"error": "Modelo não carregado."}
    try:
        features_df = pd.DataFrame([data])
        features_df = features_df.reindex(columns=model_columns, fill_value=0)
        scaled_features = scaler.transform(features_df)
        probabilities = model.predict_proba(scaled_features)[0]
        predicted_class_index = np.argmax(probabilities)
        predicted_class_name = class_map.get(predicted_class_index, "UNKNOWN")
        prob_dict = {str(i): prob for i, prob in enumerate(probabilities)}
        return {"predicted_class": predicted_class_name, "probabilities": prob_dict}
    except Exception as e:
        return {"error": f"Erro durante a predição: {str(e)}"}