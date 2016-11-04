# Classy-Redux
A Class-Based System for Creating Redux Reducers

Convert:

    const reducer = function(state={}, action) {
         function addFoo({id}, state) {
             return {...state, foo: id};
         }
         function addBar({id}, state) {
             return {...state, bar: id};
         }
         switch(action.type) {
             case 'ADD_FOO': return addFoo(action, state);
             case 'ADD_BAR': return addBar(action, state);
         }
    }
    
In to:

    class YourReducerBuilder extends ReducerBuilder {
        addFoo({id}, state) {
            return {...state, foo: id};
        }
        addBar({id}, state) {
            return {...state, bar: id};
        }
    }
    const {reducer} = new YourReducerBuilder();
    
Or, if you're not in to that whole ES6 thing ...

    function YourReducerBuilder () {};
    YourReducerBuilder.prototype.addFoo = function(action, state) {
        return Object.assign({}, state, {foo: action.id});
    }
    YourReducerBuilder.prototype.addBar = function(action, state) {
        return Object.assign({}, state, {bar: action.id});
    }
    YourResourceBuilder.prototype = new ReducerBuilder();
    const reducer = new YourReducerBuilder().reducer;


Easily combine multiple resource builders and your middleware (in any order) to create a store:

    const {store} = new StoreBuilder(fooBuilder, thunk, barBuilder, bazBuilder, window.devToolsExtension);
