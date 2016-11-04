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
