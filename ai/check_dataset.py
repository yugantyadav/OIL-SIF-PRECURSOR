import pandas as pd
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "safety_reports.csv"

df = pd.read_csv(DATA_PATH)


print("\n===== DATASET OVERVIEW =====")

print("\nNumber of rows and columns:")
print(df.shape)

print("\n===== COLUMN NAMES =====")
print(df.columns.tolist())

print("\n===== FIRST 5 ROWS =====")
print(df.head())

print("\n===== DATA TYPES =====")
print(df.dtypes)

print("\n===== MISSING VALUES =====")
print(df.isnull().sum())

print("\n===== DUPLICATE ROWS =====")
print("Number of duplicates:", df.duplicated().sum())

print("\n===== SIF DISTRIBUTION =====")

if "sif_potential" in df.columns:
    print(df["sif_potential"].value_counts())

print("\n===== LIFE SAVING RULE DISTRIBUTION =====")

if "life_saving_rule" in df.columns:
    print(df["life_saving_rule"].value_counts())
