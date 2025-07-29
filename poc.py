import os
import base64
import pytesseract
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI 
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

OPEN_API_KEY = os.getenv("OPEN_API")
LANG_CHAIN_KEY = os.getenv("LANG_CHAIN")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

os.environ["OPENAI_API_KEY"] = OPEN_API_KEY
os.environ["LANGSMITH_API_KEY"] = LANG_CHAIN_KEY
os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY
os.environ["LANGSMITH_TRACING"] = "true" 

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)

system_prompt = '''
You are a highly experienced UK maths examiner. You mark papers according to national standards with precision, consistency, and clear justification. Your role is to accurately assess student answers using the official mark scheme provided, provide detailed feedback, and return structured, accurate marks per question and overall.'''

user_prompt = '''

## TASK OVERVIEW

You have been provided with two attached files:

1. A **Mark Scheme** — the official marking criteria for a specific maths exam paper.
2. A **Student Paper** — the scanned or typed answers submitted by a student.

Your task is to:
- Read and apply the mark scheme strictly when assessing the student paper.
- Award full or partial marks per question based only on what is in the mark scheme.
- Give a brief explanation (1–2 sentences) per question to justify your marking.
- Highlight any errors or misconceptions.
- Offer a concise tip on how the student could improve, if relevant.

## OUTPUT FORMAT

Please present your output in two formats:

1. **Clean Human-Readable Format:**

Question 1: [Question Text]
Student Answer: [Response]
Marks Awarded: X/Y  
Feedback: [Justification + improvement suggestion if needed]

...
Total Score: X/Y  
General Comments: [1–2 sentences summarising overall performance]

2. **Structured JSON Format (for systems integration):**

{
  "student_name": "[Name or leave blank if not present]",
  "results": [
    {
      "question_number": 1,
      "marks_awarded": 1,
      "total_marks": 2,
      "feedback": "The student identified the correct method but made a calculation error in the final step."
    },
    ...
  ],
  "total_marks_awarded": X,
  "total_marks_available": Y,
  "general_feedback": "Overall, good method recall but careless mistakes impacted the final score."
}

## RULES

- Only use the information contained in the two attached files.
- Do not make assumptions outside the scope of the mark scheme.
- Be concise but informative and maintain a helpful, constructive tone.
- Use UK GCSE or A-Level standards depending on the content.
- If question numbers or formats are unclear, do your best to match answers to the correct scheme section.

## INPUTS

Please extract the following from the uploaded files:

- **Mark Scheme**: `[mark scheme.pdf or .jpeg]`  
- **Paper**: `[paper.pdf or .jpeg]`

Begin marking when both files are available.
'''

with open("answer.jpeg", "rb") as image_file:
          image_data = base64.b64encode(image_file.read()).decode("utf-8")

with open("mark_scheme.pdf", "rb") as image_file:
          pdf_data= base64.b64encode(image_file.read()).decode("utf-8")

with open("multi_mark_answers.pdf", "rb") as multi_data:
          paper_data = base64.b64encode(multi_data.read()).decode("utf-8")

with open("upTo13.pdf", "rb") as q_data:
          mark_scheme = base64.b64encode(q_data.read()).decode("utf-8")

with open("q_11.jpeg", "rb") as question_eleven:
          paper = base64.b64encode(question_eleven.read()).decode("utf-8")


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
            {
                "type": "text",
                "text": user_prompt
            },
           ]
        )
]

multi_mark_messages = [
        SystemMessage(
        content=[
            {"type": "text", "text": system_prompt}, 
        ]),
        HumanMessage(
            content=[
            {
                "type": "file", 
                "source_type": "base64",
                "mime_type": "application/pdf",
                "data": mark_scheme,
                "filename": "mark scheme",
            },
           {
                "type": "file", 
                "source_type": "base64",
                "mime_type": "application/pdf",
                "data": paper_data,
                "filename": "paper",
            },
           ]
        )
]

def invoke(messages):
    print('invoking llm')
    response = llm.invoke(messages)
    print(response)
    print(response.content)

def isFrontPage(filename):
    print("Running ocr..")
    str = pytesseract.image_to_string(filename)
    if 'instructions' in str.lower():
        print('is front page')
    else:
        print('mark')

isFrontPage('front_page.JPG') # expect to be true
isFrontPage('answer.jpeg') # expect to be false
invoke(multi_mark_messages)

