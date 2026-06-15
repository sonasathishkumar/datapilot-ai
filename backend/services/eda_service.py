import pandas as pd
import numpy as np
from typing import Dict, Any, List

def basic_eda(df: pd.DataFrame) -> Dict[str, Any]:
    # Handle NaNs and infs to avoid JSON serialization errors
    df_desc = df.describe(include='all').replace({np.nan: None, np.inf: None, -np.inf: None})
    
    missing_values = df.isnull().sum()
    missing_percent = (df.isnull().sum() / len(df)) * 100
    
    dtypes_str = df.dtypes.astype(str).to_dict()
    
    basic_stats = {
        "shape": {"rows": df.shape[0], "cols": df.shape[1]},
        "dtypes": dtypes_str,
        "head": df.head(10).replace({np.nan: None}).to_dict(orient="records"),
        "tail": df.tail(10).replace({np.nan: None}).to_dict(orient="records"),
        "missing_values": [
            {"column": col, "count": int(missing_values[col]), "percentage": round(missing_percent[col], 2)}
            for col in df.columns
        ],
        "duplicate_rows": int(df.duplicated().sum()),
        "description": df_desc.to_dict()
    }
    return basic_stats

def intermediate_eda(df: pd.DataFrame) -> Dict[str, Any]:
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
    
    distributions = {}
    boxplots = {}
    skew_kurt = {}
    
    for col in numeric_cols:
        # Distribution using histogram logic
        counts, bin_edges = np.histogram(df[col].dropna(), bins=20)
        distributions[col] = {
            "counts": counts.tolist(),
            "bin_edges": bin_edges.tolist()
        }
        
        # Boxplot data (min, q1, median, q3, max)
        q1 = df[col].quantile(0.25)
        q3 = df[col].quantile(0.75)
        boxplots[col] = {
            "min": float(df[col].min()),
            "q1": float(q1),
            "median": float(df[col].median()),
            "q3": float(q3),
            "max": float(df[col].max())
        }
        
        skew_kurt[col] = {
            "skewness": float(df[col].skew()),
            "kurtosis": float(df[col].kurtosis())
        }
        
    value_counts = {}
    for col in categorical_cols:
        vc = df[col].value_counts().head(10).to_dict()
        value_counts[col] = [{"label": str(k), "count": int(v)} for k, v in vc.items()]
        
    # Correlation heatmap
    corr_matrix = df[numeric_cols].corr().replace({np.nan: None}).to_dict()
    
    return {
        "distributions": distributions,
        "boxplots": boxplots,
        "value_counts": value_counts,
        "skew_kurtosis": skew_kurt,
        "correlation": corr_matrix
    }

def advanced_eda(df: pd.DataFrame, target_col: str = None) -> Dict[str, Any]:
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    # Outliers count using IQR
    outliers_count = {}
    for col in numeric_cols:
        q1 = df[col].quantile(0.25)
        q3 = df[col].quantile(0.75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        outliers = df[(df[col] < lower_bound) | (df[col] > upper_bound)].shape[0]
        outliers_count[col] = int(outliers)
        
    # VIF for multicollinearity (simplified proxy or actual if statsmodels installed)
    vif_data = []
    try:
        from statsmodels.stats.outliers_influence import variance_inflation_factor
        from statsmodels.tools.tools import add_constant
        
        # Drop rows with NaNs to compute VIF
        df_clean = df[numeric_cols].dropna()
        if not df_clean.empty and df_clean.shape[1] > 1:
            X = add_constant(df_clean)
            for i in range(1, len(X.columns)): # Skip constant
                vif = variance_inflation_factor(X.values, i)
                vif_data.append({"column": X.columns[i], "vif": float(vif)})
    except ImportError:
        pass
        
    return {
        "outliers_count": outliers_count,
        "vif": vif_data
    }
