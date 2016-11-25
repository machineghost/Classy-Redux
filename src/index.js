'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.StoreBuilder = exports.ReducerBuilder = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _redux = require('redux');

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ReducerBuilder = exports.ReducerBuilder = function () {
    function ReducerBuilder() {
        var initialState = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        var stateName = arguments[1];

        _classCallCheck(this, ReducerBuilder);

        this.initialState = initialState;
        this.stateName = this.stateName || stateName;
        this.build();
    }

    /**
     * This method (which by default is a no-op) can be overriden to add any sort of
     * "post-processing" after an action handler has been applied
     */


    _createClass(ReducerBuilder, [{
        key: 'afterAction',
        value: function afterAction(action, newState) {}

        /**
         * This method (which by default is a no-op) can be overriden to add any sort of
         * "pre-processing" before an action handler has been applied
         */

    }, {
        key: 'beforeAction',
        value: function beforeAction(action, newState) {}

        /**
         * Binds the reducer function to the ReducerBuilder.  Can be overriden to apply other reducer
         * wrapping logic (eg. Redux-Undo)
         */

    }, {
        key: 'build',
        value: function build() {
            this.reducer = this.reducer.bind(this);
        }

        /**
         * Returns a clone of the provided state
         */

    }, {
        key: 'clone',
        value: function clone(oldState) {
            return _lodash2.default.cloneDeep(oldState);
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

    }, {
        key: '_getHandler',
        value: function _getHandler(actionType) {
            if (actionType.indexOf('@@') === 0) {
                // There's no way to convert @@ to camel case, so discard it (and ditto for "/")
                actionType = actionType.substr(2).replace('/');
            }
            return this[_lodash2.default.camelCase(actionType)];
        }

        /**
         * Determines whether the provided action is one generated by Redux itself
         */

    }, {
        key: '_isReduxInitAction',
        value: function _isReduxInitAction(_ref) {
            var type = _ref.type;

            return type.startsWith('@@redux');
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

    }, {
        key: 'reducer',
        value: function reducer() {
            var oldState = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.initialState;
            var action = arguments[1];

            var newState = this.clone(oldState);
            if (this._isReduxInitAction(action)) return newState;

            var handler = this._getHandler(action.type);
            // Any (non-Redux initialization) action should have a matching handler
            if (!handler) throw new Error('Invalid action type: ' + action.type);

            // Create a variable to hold data that will only live for a single reducer cycle
            this.reduction = {};

            newState = this.beforeAction(action, newState) || newState;
            newState = handler.call(this, action, newState) || newState;
            newState = this.afterAction(action, newState) || newState;
            return this._state = newState;
        }

        /**
         * Of course the actual state is stored in Redux, not in this class, but we keep a copy of
         * the last state given to Redux as a convenience, which can be accessed through this getter.
         */

    }, {
        key: 'state',
        get: function get() {
            return this._state;
        }
    }]);

    return ReducerBuilder;
}();

var isReducer = function isReducer(possible) {
    return possible.prototype instanceof ReducerBuilder;
};
var isNotReducer = function isNotReducer(possible) {
    return !isReducer(possible);
};

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

var StoreBuilder = exports.StoreBuilder = function () {
    function StoreBuilder() {
        _classCallCheck(this, StoreBuilder);

        for (var _len = arguments.length, reducerBuildersAndMiddleware = Array(_len), _key = 0; _key < _len; _key++) {
            reducerBuildersAndMiddleware[_key] = arguments[_key];
        }

        this._middleware = reducerBuildersAndMiddleware.filter(isNotReducer);
        this._buildMiddleware();

        this._reducerBuilderClasses = reducerBuildersAndMiddleware.filter(isReducer);
        this._buildReducers();
    }

    _createClass(StoreBuilder, [{
        key: '_buildMiddleware',
        value: function _buildMiddleware(reducerBuildersAndMiddleware) {
            this._composedMiddleware = this.compose.apply(this, _toConsumableArray(this._middleware));
        }
    }, {
        key: '_buildReducers',
        value: function _buildReducers() {
            // NOTE: We don't *need* to be storing all of these as properties of the store builder ...
            //       ... but it makes testing a whole lot easier (vs. using local variables)
            this._reducerBuilders = this._reducerBuilderClasses.map(function (Builder) {
                return new Builder();
            });
            this._reducers = this._reducerBuilders.reduce(function (reducers, reducerBuilder) {
                if (!reducerBuilder.stateName) throw new Error('Every reducer builder must have a ' + 'stateName to  serve as its key in ' + 'the store state');
                reducers[reducerBuilder.stateName] = reducerBuilder.reducer;
                return reducers;
            }, {});
            this._combinedReducers = this.combineReducers(this._reducers);
        }
        /**
         * Simple alias for Redux's combineReducers (that can more easily be stubbed when testing).
         * Hypothetically if someone wanted to use a custom "combineReducers" function, this would be
         * the place to do it.
         */

    }, {
        key: 'combineReducers',
        value: function combineReducers() {
            return _redux.combineReducers.apply(undefined, arguments);
        }
        /**
         * Simple alias for Redux's compose (that can more easily be stubbed when testing).
         * Hypothetically if someone wanted to use a custom "compose" function, this would be the place
         * to do it.
         */

    }, {
        key: 'compose',
        value: function compose() {
            return _redux.compose.apply(undefined, arguments);
        }
        /**
         * Returns a version of createStore that has been "enhanced" with the provided middleware.
         */

    }, {
        key: 'createStore',
        get: function get() {
            return this._createStore = this._createStore || this._composedMiddleware(_redux.createStore);
        }
    }, {
        key: 'store',
        get: function get() {
            return this._store = this._store || this.createStore(this._combinedReducers);
        }
    }]);

    return StoreBuilder;
}();
