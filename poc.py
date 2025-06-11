import os
from dotenv import load_dotenv

load_dotenv()

OPEN_API_KEY = os.getenv("OPEN_API")
LANG_CHAIN_KEY = os.getenv("LANG_CHAIN")


