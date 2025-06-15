import os
import getpass
import base64
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI 
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage

load_dotenv()

OPEN_API_KEY = os.getenv("OPEN_API")
LANG_CHAIN_KEY = os.getenv("LANG_CHAIN")

os.environ["OPENAI_API_KEY"] = OPEN_API_KEY
os.environ["LANGSMITH_API_KEY"] = LANG_CHAIN_KEY
os.environ["LANGSMITH_TRACING"] = "true" 

llm = ChatOpenAI(model="gpt-4o", temperature=0)

system_prompt = "You are a maths teacher marking a students maths paper. Use the following pieces of information to answer the paper using the provided mark scheme. If you are unsure or don't know the answer, say that you don't know."

with open("answer.jpeg", "rb") as image_file:
          image_data = base64.b64encode(image_file.read()).decode("utf-8")

with open("mark_scheme.pdf", "rb") as image_file:
          pdf_data= base64.b64encode(image_file.read()).decode("utf-8")

messages = [
        SystemMessage(
        content=[
            {"type": "text", "text": system_prompt}, 
        ]),
        HumanMessage(
            content=[
            {
                "type": "image", 
                "source_type": "base64",
                "mime_type": "image/jpeg",
                "data": image_data,
            },
            {
                "type": "file", 
                "source_type": "base64",
                "mime_type": "application/pdf",
                "data": pdf_data,
                "filename": "mark_scheme",
            },
           ]
        )
]

response = llm.invoke(messages)
print(response)
print(response.content)

