JSJS.SetCallHook = function(rt, callHookFunc, closure) {
    var funcPosition = FUNCTION_TABLE.push(callHookFunc) - 1;
    return _JS_SetCallHook(rt, funcPosition, closure);
};

var JSWasabi = {
    // Set an eval callback
    // The callback takes these parameters: evalArgs, callerFunc
    SetEvalCallback: function (callback) {
        this._evalCallback = callback;
    },
    SetCallHook: function (cx, rt, callback) {
        function callHookFunc(cx, fp, before, ok, closure) {
            console.log('Function called', before, ok, closure);
            var fn = _JS_GetFrameFunction(cx, fp);
            if (!fn) {
                return closure;
            }

            // Try to get the name of non-anonymous functions
            var name = _JS_GetFunctionId(fn);
            if (name) {
                var idStr = _JSID_TO_STRING(name);
                idStr = _JS_GetStringCharsZ(cx, idStr); 
                var funcName = JSJS.parseUTF16(idStr);

                JSWasabi._callHookCallback(funcName);
            } else {
                JSWasabi._callHookCallback('[anonymous]');
            }

            // console.log("Call Hook!", getValue(fp + 4, 'i32'));
            return closure;
        }

        _JS_SetDebugMode(cx, true);

        JSWasabi._callHookCallback = callback;

        var res = JSJS.SetCallHook(rt, callHookFunc, this);
        // console.log('Call hook', res ? 'set' : 'not set');
    }
}
window['JSWasabi'] = JSWasabi;


// Override SpiderMonkey's eval function with our own which also calls a callback function
/* Eval function in js.js's name-mangled SpiderMonkey.
Demangled: _EvalKernel(JSContext*, js::CallArgs const&, EvalType, js::StackFrame*, JSObject&) */
_originalEval = __ZL10EvalKernelP9JSContextRKN2js8CallArgsE8EvalTypePNS1_10StackFrameER8JSObject;
__ZL10EvalKernelP9JSContextRKN2js8CallArgsE8EvalTypePNS1_10StackFrameER8JSObject = function ($cx, $call, $evalType, $caller, $scopeobj) {
    var callerFunc;

    var fn = _JS_GetFrameFunction($cx, $caller);
    if (fn) {        
        // Try to get the name of non-anonymous functions
        var name = _JS_GetFunctionId(fn);
        if (name) {
            var idStr = _JSID_TO_STRING(name);
            idStr = _JS_GetStringCharsZ($cx, idStr); 
            var idStrReal = JSJS.parseUTF16(idStr);
            callerFunc = idStrReal;
        }
    }

    var result = _originalEval($cx, $call, $evalType, $caller, $scopeobj);

    // Get the argument to eval
    var argv = __ZNK2js8CallArgs4argvEv($call);
    var evalArgs = JSJS.identifyConvertValue($cx, argv);

    // TODO: Get and report the return value
    // TODO: Report the line number if possible

    JSWasabi._evalCallback(evalArgs, callerFunc);

    return result;
};

// Augment JSJS Types with a JSVal type which performs no type conversion.
JSJS.Types['JSVal'] = new function() {
        this['toJSVal'] = function(jsval, val, cx) {
            _memcpy(jsval, val, 8);
            return;
        };
        this['type'] = 'JSVal';
};
