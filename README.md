# Classy-Redux
A "Classier" system of creating Redux reducer functions

## Basic Example

Classy Redux let's you convert this (from the Redux To Do example):

    const todo = (state = {}, action) => {
        switch (action.type) {
            case 'ADD_TODO':
                return {
                    id: action.id,
                    text: action.text,
                    completed: false
                }
            case 'TOGGLE_TODO':
                if (state.id !== action.id) {
                    return state
                }
    
                return Object.assign({}, state, {
                    completed: !state.completed
                })
    
            default:
                return state
        }
    }
    const todos = (state = [], action) => {
        switch (action.type) {
            case 'ADD_TODO':
                return [
                    ...state,
                    todo(undefined, action)
                ]
            case 'TOGGLE_TODO':
                return state.map(t =>
                    todo(t, action)
                )
            default:
                return state
        }
    }
    
Into this:

    class TodosBuilder extends ReducerBuilder {
        addTodo({id, text}, state) {
            state.push(this._buildTodo(action);
        }
        _buildTodo({id, text}) {
            return {completed: false, id, text};
        }
        _toggleCompletion(id, todo) {
            if (todo.id === id)  {
                todo.completed = !todo.completed;
            }
            return todo;
        }
        toggleTodo({id}, state) {
            return state.map(t => this._toggleCompletion(id, t));
        }
    }
    const todoReducer = new TodoBuilder(`todos`, {}).reducer;

## There's no `switch`/`case`, `return`, or immutability?

### How are actions routed?

When a `RecourceBuilder.reducer` receives an action it passes it to the *action handler* for that action's type.  The handler for an action is simply the method of the class with same name as the type (converted to camel case), eg. `{type: 'ADD_FOO_BAR'}` to `addFooBar`.

If no corresponding method can be found for a provided action, Classy Redux throws an error.

### How do you return the new state?

Before Classy Redux passes the action to its handler it calls its `clone` method on the previous reducer state to generate a new version of it.  By default the `clone` method is just `(oldState) => _.cloneDeep(oldState)`, but you can override it to use a different clone algorithim (or none at all, if you would prefer to create a new state separately in each action handler).

Once it has cloned the previous state the new cloned state is passed (along with the action) to the action handler.  If the action handler returns a "truthy" value, that value will become the new state.  If the handler doesn't return a value though the `reducer` will still return the cloned new state.

Thanks to the power of mutation, action handlers can simply modify the provided state object in-place without returning anything:

    addBar(action, state) {
        state.bars.push(bar);
    }

### What about immutability?

Classy Redux provides two methods that you can override to add logic which runs before or after every action handler: `afterAction` and `beforeAction`.  These methods work just like an action handler, in that they are passed `action` and `state` arguments and any truthy value they return will be used as the new state, but they are run before/after each action is handled.

If you wanted to use an immutability library to ensure that your state object doesn't get modified you could override the `afterAction` method to make the about-to-be-returned state immutable:

    afterEach(action, state) {
        return Immutable.Map(state);
    }

### What about reducer decorators (eg. Redux Undo)?

The `ResourceBuilder` `build` method is called in the class's `constructor`, and by default all it does is bind the `reducer` function to the `ResourceBuilder` instance.  However, you can override this method to add logic for "decorating" your reducer:

    build() {
        super.build();
        this.reducer = undoable(this.reducer, {debug: false, filter: distinctState()});
    }

## StoreBuilder

Reducers created from a `ReducerBuilder` can be used directly with Redux's `createStore`:

    const reducer = new YourReducerBuilder().reducer;
    const store = createStore(reducer);

However Classy Redux also offers an optional StoreBuilder that lets you easily combine as many resource builders and middleware as you want, in any order:

    const {store} = new StoreBuilder(fooBuilder, thunk, barBuilder, bazBuilder, window.devToolsExtension);
