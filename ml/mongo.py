# ml/mongo.py
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "smart_auction")  # <-- add this

def get_db():
    client = MongoClient(MONGO_URI)
    return client[DB_NAME]
