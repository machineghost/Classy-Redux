import {
    combineReducers,
    compose,
    createStore
} from 'redux';
import _ from 'lodash';

export class ReducerBuilder {
    constructor(stateName, initialState = {}) {
        this.initialState = initialState;
        this._stateName = stateName;
        this.reducer = this.reducer.bind(this);
    }

    /**
     * Returns the matching method for the provided action type, if any.
     * "Matching" in this case means the method with a name that is the same as
     * the provided action type, except camel-cased instead of underscored.
     *
     * NOTE: Redux actions look like "@@redux/INIT" but clearly neither "@@" nor
     *       "/" can be converted to camel-case (ie. we can't have a
     *       "@@redux/Init" method). For this reason, handlers for Redux actions
     *       should leave out both the "@@" and the "/".  For instance, the
     *       handler for the redux init action should be "reduxInit".
     * @param {string} actionType - an string describing an action, in Redux
     *     standard (ie. capitalized and underscored) format
     * @returns {function} - the appropriate handler for the provided action
     *     type, if any
     */
    _getHandler(actionType) {
        if (actionType.indexOf('@@') === 0) {
            // There's no way to convert @@ to camel case, so discard it
            actionType = actionType.substr(2);
            // Ditto for "/"
            actionType.replace('/');
        }
        return this[_.camelCase(actionType)];
    }

    get stateName() {
        if (!this._stateName) throw new Error(
            `Every reducer builder must have a stateName to serve as its key in the store state`);
        return this._stateName;
    }

    /**
     * The default reducer for all reducerBuilders.  It:
     * A) generates a new state as a deep clone of the current state
     * B) finds the appropriate handling method for the provided action
     * C) invokes it (unless it was a non-Redux action and no handler was found
     *    in which case it throws an eror)
     *
     * NOTE: Obviously cloning everything on every action is a bit overkill. If
     *       this ever becomes a performance problem this method can simply be
     *       overwritten to use a more performant method of creating the new
     *       state.
     *
     *
     * @param oldState - the current state
     * @param action - an object with a type property that desscribes the action
     * @returns {array|object} - the new state
     */
    reducer(oldState = this.initialState, action) {
        let newState = _.cloneDeep(oldState);
        const handler = this._getHandler(action.type);
        const isReduxInit = action.type.startsWith('@@redux') || action.type.startsWith('@@INIT');
        if (!handler && !isReduxInit) {
            // Any (non-Redux init) action should have a matching handler
            throw new Error(`Invalid action type: ${action.type}`);
        }
        return handler ?
               handler.call(this, action, newState) || newState :
               newState;
    }
}

const isReducer = (possible) => possible.prototype instanceof ReducerBuilder;
const isNotReducer = (possible) => !isReducer(possible);

/**
 * Simple convenience class for creating a store from ReducerBuilder classes instead of
 * reducer functions.
 *
 * @param {ReducerBuilder[]|function[]} reducerBuildersAndMiddleware - 1+ Reducer builders and 0+
 *     middleware functions, all of which will be combined to create the store
 *
 * @example
 * const storeBuilder = new StoreBuilder(builder1, middleware1, builder2, middleware2, ...);
 * const reduxStore = storeBuilder.store;
 */
export class StoreBuilder {
    constructor(...reducerBuildersAndMiddlewares) {
        const reducerBuilders = reducerBuildersAndMiddlewares.filter(isReducer);
        this._reducerBuilders = reducerBuilders.map(ReducerBuilder => new ReducerBuilder());
        this._middleware = reducerBuildersAndMiddlewares.filter(isNotReducer);
    }
    get reducers() {
        const reducersMap = this._reducerBuilders.reduce((reducersMap, reducerBuilder) => {
            reducersMap[reducerBuilder.stateName] = reducerBuilder.reducer;
            return reducersMap;
        }, {});
        return combineReducers(reducersMap);
    }
    _buildStore() {
        const enhancedCreateStore = compose(...this._middleware)(createStore);
        this._store = enhancedCreateStore(this.reducers);
    }
    get store() {
        if (!this._store) {
            this._buildStore();
        }
        return this._store;
    }
}