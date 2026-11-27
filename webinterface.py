from langchain.messages import HumanMessage
from nicegui import ui, app, run
from main import agent
from tkinter import Tk

root = Tk()
root.withdraw()

screen_height = root.winfo_screenheight()
root.destroy()

is_agent_thinking = False
history = []

@ui.refreshable
def render_chat():
    with ui.scroll_area().classes(f'h-[{screen_height - 400}px]') as sa:
        for owner, message in app.storage.user['user_history']:
            ui.markdown(message).classes(f'w-full text-{"right" if (owner == 'user') else "left"}')
            ui.separator()

    if is_agent_thinking:
        with ui.skeleton().classes('w-full'):
            ui.label('Thinking...').classes('w-full')

    sa.scroll_to(percent=1.0)

def clear_chat():
    app.storage.user['user_history'] = []
    render_chat.refresh()

async def add_user_message(message):
    global is_agent_thinking

    if message == 'clear':
        clear_chat()
        return

    app.storage.user['user_history'].append(('user', message))
    history.append(HumanMessage(message))
    is_agent_thinking = True
    render_chat.refresh()

    reply = await run.io_bound(agent.invoke, {'messages': history}, config={'recursion_limit': 30})
    reply = reply['messages'][-1].content

    app.storage.user['user_history'].append(('system', reply))
    history.append(reply)
    is_agent_thinking = False
    render_chat.refresh()

@ui.page('/')
def main():
    with ui.header(value=True):
        ui.label('Sitely').classes('w-full text-center').style('font-size: 20px')

    ui.footer()

    if not 'user_history' in app.storage.user:
        app.storage.user['user_history'] = [('system', 'Hello Chat')]

    with ui.card().classes('w-full').props('flat bordered'):
        render_chat()

        text_input = ui.input(
            placeholder='Start typing to chat',
        ).classes('w-full').props('outlined rounded')

        with text_input.add_slot('after'):
            ui.chip(
                text='Clear chat',
                icon='delete',
                on_click=lambda: clear_chat(),
            )

        text_input.on('keydown.enter', lambda: add_user_message(text_input.value))
        text_input.on('keydown.enter', lambda: text_input.set_value(''))

ui.run(storage_secret='st-123abc')