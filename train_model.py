# train_model.py
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.preprocessing import LabelEncoder, StandardScaler
import joblib
import os

def train_exoplanet_model():
    print("Iniciando o processo de treino do modelo...")
    print("Baixando os dados mais recentes do NASA Exoplanet Archive...")
    url = "https://exoplanetarchive.ipac.caltech.edu/cgi-bin/nstedAPI/nph-nstedAPI?table=cumulative&select=*&format=csv"
    try:
        df = pd.read_csv(url)
        print("Dados baixados com sucesso.")
    except Exception as e:
        print(f"Erro ao baixar os dados: {e}")
        return

    features = [
        'koi_period', 'koi_duration', 'koi_depth', 'koi_prad', 'koi_teq',
        'koi_model_snr', 'koi_fpflag_nt', 'koi_fpflag_ss',
        'koi_fpflag_co', 'koi_fpflag_ec',
    ]
    target = 'koi_disposition'
    
    df_filtered = df[features + [target]].copy()
    df_filtered.dropna(inplace=True)
    df_clean = df_filtered[df_filtered[target].isin(['CONFIRMED', 'CANDIDATE', 'FALSE POSITIVE'])]
    print(f"Dataset reduzido para {df_clean.shape[0]} amostras após a limpeza.")

    le = LabelEncoder()
    df_clean['target_encoded'] = le.fit_transform(df_clean[target])
    class_names = le.classes_
    print(f"Mapeamento de classes: {list(zip(le.transform(class_names), class_names))}")
    
    X = df_clean[features]
    y = df_clean['target_encoded']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42, stratify=y)
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    print("Treinando o modelo RandomForestClassifier...")
    model = RandomForestClassifier(n_estimators=200, random_state=42, class_weight="balanced", n_jobs=-1)
    model.fit(X_train_scaled, y_train)
    print("Treino completo.")

    y_pred = model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\nAcurácia final do modelo: {accuracy:.4f}")
    print("\nRelatório de Classificação:")
    print(classification_report(y_test, y_pred, target_names=class_names))

    print("\nEmpacotando artefatos para salvamento...")
    model_artifacts = {'model': model, 'columns': features, 'scaler': scaler}
    os.makedirs('saved_model', exist_ok=True)
    file_path = 'saved_model/best_exoplanet_classifier.joblib'
    joblib.dump(model_artifacts, file_path)
    print(f"✅ Artefatos salvos com sucesso em '{file_path}'!")

if __name__ == '__main__':
    train_exoplanet_model()