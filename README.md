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

### If there's no `switch`/`case`, how does it know how to handle actions?

When a `RecourceBuilder.reducer` receives an action it passes it to the *action handler* for that action's type.  The handler for an action is simply the method of the class with a name matching the (converted to camel case) action type.  For instance, an action`{type: 'ADD_FOO_BAR'}` would be handled by an `addFooBar` method.

If no corresponding method can be found for a provided action, Classy Redux throws an error.

### Why does addTodo have no `return` and looks like it's mutating state?

Before Classy Redux passes the action to its handler it ensures that the old state doesn't get modified by calling its `clone` method to generate a new version of the state from the previous one.  By default the `clone` method is just `(oldState) => _.cloneDeep(oldState)`, but you can override it to use a different clone algorithim (or none at all, if you would prefer to create a new state separately in each action handler).

Once it has cloned the previous state the new cloned state is passed (along with the action) to the action handler.  If the action handler returns a "truthy" value, that value will become the new state.  If the handler *doesn't* return a value, the `reducer` will instead return the cloned state object.

This allows action handlers to simply modify the provided state object in-place, without returning anything, and their changes will still be applied:

    addBar(action, state) {
        state.bars.push(bar);
    }

### What about immutability or pre/post-processing?

Classy Redux provides two methods that you can override to add logic before or after every action handler: `afterAction` and `beforeAction`.  These methods work just like an action handler, in that they are passed `action` and `state` arguments, and any truthy value they return will be used as the new state.

If you wish to use an immutability library you can override the `afterAction` method to apply an immutability function to the state after its action handler finishes:

    afterEach(action, state) {
        return Immutable.Map(state);
    }

### What about reducer decorators (eg. Redux Undo)?

The `ResourceBuilder` `build` method is called in the class's `constructor`, and by default all it does is bind the `reducer` function to the `ResourceBuilder` instance.  However, you can override this method to add logic for "decorating" your reducer:

    build() {
        super.build();
        this.reducer = undoable(this.reducer, {debug: false, filter: distinctState()});
    }

### How can I set an initial state for the reducer to use if none is provided?

By default if no state is provided `ReducerBuilder` will generate a new state of `{}`.  You can override this and give the `ReducerBuilder` a different initial state by setting it as a property:

     // With the babel transformation "transform-class-properties"
     class FooResourceBuilder extends ResourceBuilder {
         initialState = {initialValue: 'some value'};
     }
     
     // Without "transform-class-properties"
     class FooResourceBuilder extends ResourceBuilder {}
     FooResourceBuilder.prototype.initialState = {initialValue: 'some value'};

### What if I want to share variables between `beforeAction`/`afterAction` and the action handler?

Because the reducer is bound to its `ReducerBuilder`, you *could* define properties in one method and use them in another:

    beforeEach() {
        this._count = 0;
    }
    _doSomethingRepeatedly(things) {
        things.forEach(() => this._count += 1);
    }
    someAction(action, state) {
        this._doSomethingRepeatedly(action.things);
        return this._count;
    }

However, the problem with doing that is that you might accidentally leave a property value from one call and have it affect another, later call.  To avoid this Classy Redux recommends not defining properties directly on the `ReducerBuilder` instance,  but instead on its `reduction` property.  This property is automatically reset before every action is handled, so you never have to worry about "cleaning it up":

    beforeEach() {
         this.reduction.count = 0;
    }
    _doSomethingRepeatedly(things) {
        things.forEach(() => this.reduction.count += 1);
    }
    someAction(action, state) {
        this._doSomethingRepeatedly(action.things);
        return this.reduction.count;
    }

## StoreBuilder

Reducers created from a `ReducerBuilder` can be used directly with Redux's `createStore`:

    const reducer = new YourReducerBuilder().reducer;
    const store = createStore(reducer);

However Classy Redux also offers an optional StoreBuilder that lets you easily combine as many resource builders and middleware as you want, in any order:

    const {store} = new StoreBuilder(fooBuilder, thunk, barBuilder, bazBuilder, window.devToolsExtension);
    
To use the `StoreBuilder` you must define a `stateName` property for each `ReducerBuilder` to serve as the key for the reducer when it is passed to `combineReducers`.  This can be set the same way as the `initialState`:

    // With the babel transformation "transform-class-properties"
     class FooResourceBuilder extends ResourceBuilder {
         stateName = 'foo';
     }
     
     // Without "transform-class-properties"
     class FooResourceBuilder extends ResourceBuilder {}
     FooResourceBuilder.prototype.stateName = 'foo';
