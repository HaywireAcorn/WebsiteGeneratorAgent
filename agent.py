from langchain.tools import tool
from langchain.chat_models import init_chat_model
from dotenv import load_dotenv
from pathlib import Path
import os

load_dotenv()

SITE_DIR = (Path(__file__).parent / 'workspace').resolve()
SITE_DIR.mkdir(parents=True, exist_ok=True)

base_model = init_chat_model(
    model='deepseek-flash',
    api_key=os.getenv('DEEPSEEK_API_KEY'),
    base_url='https://api.deepseek.com',
)

### TOOLS ###
@tool
def write_file(path: str, content: str):
    '''
        Creates or Overwrites a file in the site folder

        Args:
            path (str): The path of the file to be written, relative to the site directory
            content (str): The content to be written to the file
    '''
    (SITE_DIR / path).write_text(content, encoding='utf-8')

@tool
def read_file(path: str):
    '''
        Reads a file in the site folder

        Args:
            filename (str): The filename to be read
    '''
    return path.read_text(encoding='utf-8')

tools = [write_file, read_file]
tools_by_name = {tool.name: tool for tool in tools}
model_with_tools = base_model.bind_tools(tools)
