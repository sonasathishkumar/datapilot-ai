import pandas as pd
import numpy as np
import time
from typing import Dict, Any, List
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, LabelEncoder
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error, mean_absolute_percentage_error
from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge, Lasso
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier
from sklearn.svm import SVC, SVR
from sklearn.neighbors import KNeighborsClassifier
from xgboost import XGBClassifier, XGBRegressor
from lightgbm import LGBMClassifier, LGBMRegressor

def preprocess_data(df: pd.DataFrame, options: Dict[str, Any]) -> pd.DataFrame:
    df_clean = df.copy()
    
    # Drop high null columns
    if "drop_null_threshold" in options:
        threshold = options["drop_null_threshold"] / 100.0
        missing_pct = df_clean.isnull().mean()
        cols_to_drop = missing_pct[missing_pct > threshold].index
        df_clean.drop(columns=cols_to_drop, inplace=True)
        
    # Handle missing values
    missing_strategy = options.get("missing_strategy", "Mean")
    num_cols = df_clean.select_dtypes(include=[np.number]).columns
    cat_cols = df_clean.select_dtypes(exclude=[np.number]).columns
    
    if missing_strategy == "Drop rows":
        df_clean.dropna(inplace=True)
    elif missing_strategy == "Mean":
        df_clean[num_cols] = df_clean[num_cols].fillna(df_clean[num_cols].mean())
        for col in cat_cols:
            if not df_clean[col].mode().empty:
                df_clean[col] = df_clean[col].fillna(df_clean[col].mode()[0])
    elif missing_strategy == "Median":
        df_clean[num_cols] = df_clean[num_cols].fillna(df_clean[num_cols].median())
        for col in cat_cols:
            if not df_clean[col].mode().empty:
                df_clean[col] = df_clean[col].fillna(df_clean[col].mode()[0])
    elif missing_strategy == "Mode":
        for col in df_clean.columns:
            if not df_clean[col].mode().empty:
                df_clean[col] = df_clean[col].fillna(df_clean[col].mode()[0])

    # Remove duplicates
    if options.get("remove_duplicates", False):
        df_clean.drop_duplicates(inplace=True)
        
    # Encode categoricals
    encoding = options.get("encoding", "Label Encoding")
    cat_cols_remaining = df_clean.select_dtypes(exclude=[np.number]).columns
    if encoding == "Label Encoding":
        le = LabelEncoder()
        for col in cat_cols_remaining:
            df_clean[col] = le.fit_transform(df_clean[col].astype(str))
    elif encoding == "One-Hot Encoding":
        df_clean = pd.get_dummies(df_clean, columns=cat_cols_remaining, drop_first=True)
        
    # Scaling
    scaling = options.get("scaling", "None")
    num_cols_remaining = df_clean.select_dtypes(include=[np.number]).columns
    
    if scaling == "StandardScaler":
        scaler = StandardScaler()
        df_clean[num_cols_remaining] = scaler.fit_transform(df_clean[num_cols_remaining])
    elif scaling == "MinMaxScaler":
        scaler = MinMaxScaler()
        df_clean[num_cols_remaining] = scaler.fit_transform(df_clean[num_cols_remaining])
    elif scaling == "RobustScaler":
        scaler = RobustScaler()
        df_clean[num_cols_remaining] = scaler.fit_transform(df_clean[num_cols_remaining])
        
    return df_clean

def train_models(df: pd.DataFrame, target: str, problem_type: str) -> List[Dict[str, Any]]:
    X = df.drop(columns=[target])
    y = df[target]
    
    # Auto-detect problem type if not strictly provided
    if problem_type == "Auto":
        if y.nunique() < 20 and y.dtype in [np.int64, object, bool]:
            problem_type = "Classification"
        else:
            problem_type = "Regression"
            
    # Basic numeric conversion if needed
    if y.dtype == object:
        le = LabelEncoder()
        y = le.fit_transform(y)
        
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    results = []
    
    if problem_type == "Classification":
        models = {
            "Logistic Regression": LogisticRegression(max_iter=1000),
            "Decision Tree": DecisionTreeClassifier(),
            "Random Forest": RandomForestClassifier(n_estimators=50),
            "XGBoost": XGBClassifier(use_label_encoder=False, eval_metric='logloss'),
            "LightGBM": LGBMClassifier(),
            "KNN": KNeighborsClassifier()
        }
        
        for name, model in models.items():
            start_time = time.time()
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            train_time = time.time() - start_time
            
            # Use appropriate averaging if multiclass
            avg = 'weighted' if len(np.unique(y)) > 2 else 'binary'
            
            acc = accuracy_score(y_test, y_pred)
            prec = precision_score(y_test, y_pred, average=avg, zero_division=0)
            rec = recall_score(y_test, y_pred, average=avg, zero_division=0)
            f1 = f1_score(y_test, y_pred, average=avg, zero_division=0)
            
            try:
                if hasattr(model, "predict_proba"):
                    y_proba = model.predict_proba(X_test)
                    if avg == 'binary':
                        roc_auc = roc_auc_score(y_test, y_proba[:, 1])
                    else:
                        roc_auc = roc_auc_score(y_test, y_proba, multi_class='ovr')
                else:
                    roc_auc = None
            except:
                roc_auc = None
                
            # Feature importance
            importance = []
            if hasattr(model, "feature_importances_"):
                imp = model.feature_importances_
                importance = [{"feature": col, "importance": float(val)} for col, val in zip(X.columns, imp)]
                importance = sorted(importance, key=lambda x: x["importance"], reverse=True)[:15]
                
            results.append({
                "model": name,
                "metrics": {
                    "Accuracy": float(acc),
                    "Precision": float(prec),
                    "Recall": float(rec),
                    "F1": float(f1),
                    "ROC_AUC": float(roc_auc) if roc_auc else None
                },
                "time_taken": round(train_time, 4),
                "feature_importance": importance
            })
            
    else: # Regression
        models = {
            "Linear Regression": LinearRegression(),
            "Ridge": Ridge(),
            "Lasso": Lasso(),
            "Decision Tree": DecisionTreeRegressor(),
            "Random Forest": RandomForestRegressor(n_estimators=50),
            "XGBoost": XGBRegressor(),
            "LightGBM": LGBMRegressor()
        }
        
        for name, model in models.items():
            start_time = time.time()
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            train_time = time.time() - start_time
            
            r2 = r2_score(y_test, y_pred)
            rmse = np.sqrt(mean_squared_error(y_test, y_pred))
            mae = mean_absolute_error(y_test, y_pred)
            mape = mean_absolute_percentage_error(y_test, y_pred)
            
            # Feature importance
            importance = []
            if hasattr(model, "feature_importances_"):
                imp = model.feature_importances_
                importance = [{"feature": col, "importance": float(val)} for col, val in zip(X.columns, imp)]
                importance = sorted(importance, key=lambda x: x["importance"], reverse=True)[:15]
            elif hasattr(model, "coef_"):
                imp = np.abs(model.coef_)
                importance = [{"feature": col, "importance": float(val)} for col, val in zip(X.columns, imp)]
                importance = sorted(importance, key=lambda x: x["importance"], reverse=True)[:15]
                
            results.append({
                "model": name,
                "metrics": {
                    "R2": float(r2),
                    "RMSE": float(rmse),
                    "MAE": float(mae),
                    "MAPE": float(mape)
                },
                "time_taken": round(train_time, 4),
                "feature_importance": importance
            })
            
    return results
