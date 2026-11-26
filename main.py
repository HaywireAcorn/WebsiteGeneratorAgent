from typing import Annotated, Literal
from langchain import messages
from typing_extensions import TypedDict
from langchain.messages import ToolMessage, HumanMessage, SystemMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from agent import model_with_tools, tools_by_name

### CLASSES ###
class DataTypes(TypedDict):
    messages: Annotated[list, add_messages]

### MODEL NODES ###
def llm_call_node(state: dict):
    '''Main LLM call node'''

    return {
        'messages': [
            model_with_tools.invoke(
                [
                    SystemMessage(
                        content= '''
                        You are A Web Building Agent that builds websites according to the user's liking,
                        Generate only 3 files (main.html, styles.css, scripts.js),
                        Plan briefly beforehand and use the tools provided to you,
                        Keep your Color Palette Consistent,
                        Make sure pages are Responsive,
                        Only Send Raw Text of the website when prompted
                        Only Build a Website when prompted otherwise respond to the user's message,
                        and ask what they would like you to build.
                        '''
                    )
                ] + state['messages']
            )
        ]
    }

def tool_node(state: dict):
    '''Performs the tool call'''

    result = []
    for tool_call in state['messages'][-1].tool_calls:
        tool = tools_by_name[tool_call['name']]

        try:
            observation = tool.invoke(tool_call['args'])
        except Exception as e:
            observation = f'Error: {e}'

        result.append(ToolMessage(content=observation, tool_call_id=tool_call['id']))

    return {'messages': result}

def should_call_tool(state: dict) -> Literal['tool_node', END]:
    '''Decides whether the LLM should call tools'''

    if state['messages'][-1].tool_calls:
        return 'tool_node'
    else:
        return END

### GRAPH BUILDER ###
graph_builder = StateGraph(DataTypes)

graph_builder.add_node('llm_call', llm_call_node)
graph_builder.add_node('tool_node', tool_node)

graph_builder.add_conditional_edges(
    'llm_call',
    should_call_tool,
    ['tool_node', END]
)

graph_builder.add_edge(START, 'llm_call')
graph_builder.add_edge('tool_node', 'llm_call')

agent = graph_builder.compile()

### MAIN LOOP ###
history = []
while True:
    history.append(HumanMessage(content=input('Enter Message: ')))
    print('Thinking...')
    result = agent.invoke({'messages': history}, config={'recursion_limit': 30})
    history = result['messages']
    history[-1].pretty_print()
