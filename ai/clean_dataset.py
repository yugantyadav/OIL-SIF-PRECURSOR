import pandas as pd
from pathlib import Path


# ==========================================
# FIND PROJECT PATH
# ==========================================

BASE_DIR = Path(__file__).resolve().parent.parent

INPUT_PATH = BASE_DIR / "data" / "safety_reports.csv"

OUTPUT_PATH = BASE_DIR / "data" / "cleaned_safety_reports.csv"


# ==========================================
# LOAD DATASET
# ==========================================

df = pd.read_csv(INPUT_PATH)

print("Original dataset shape:", df.shape)


# ==========================================
# CLEAN REPORT TEXT
# ==========================================

df["report_text"] = (
    df["report_text"]
    .astype(str)
    .str.strip()
    .str.replace(r"\s+", " ", regex=True)
)


# ==========================================
# CLEAN TEXT COLUMNS
# ==========================================

text_columns = [
    "life_saving_rule",
    "activity",
    "location",
    "barrier_failure",
    "site"
]

for column in text_columns:
    df[column] = df[column].astype("string").str.strip()


# ==========================================
# HANDLE MISSING LIFE-SAVING RULES
# ==========================================

df["life_saving_rule"] = (
    df["life_saving_rule"]
    .fillna("None")
)


# ==========================================
# REMOVE DUPLICATES
# ==========================================

before = len(df)

df = df.drop_duplicates()

after = len(df)

print("Duplicates removed:", before - after)


# ==========================================
# REMOVE EMPTY REPORTS
# ==========================================

df = df.dropna(subset=["report_text"])

df = df[df["report_text"].str.strip() != ""]


# ==========================================
# SAVE CLEAN DATASET
# ==========================================

df.to_csv(OUTPUT_PATH, index=False)

print("\nCleaning completed successfully!")
print("Final dataset shape:", df.shape)

print("\nCleaned dataset saved at:")
print(OUTPUT_PATH)


# ==========================================
# FINAL CHECK
# ==========================================

print("\nMissing values:")

print(df.isnull().sum())
