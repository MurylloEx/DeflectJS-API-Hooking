/** Hook types */
const DEFLECT_PRE_OPERATION_HOOK            = 0x01;
const DEFLECT_OVERWRITTEN_HOOK              = 0x02;
const DEFLECT_POST_OPERATION_HOOK           = 0x04;
const DEFLECT_NATIVE_PRE_OPERATION_HOOK     = 0x08;
const DEFLECT_NATIVE_OVERWRITTEN_HOOK       = 0x10;
const DEFLECT_NATIVE_POST_OPERATION_HOOK    = 0x20;

/** Return code of deflect api calls */
const DEFLECT_STATE_WAITING         = 0x01;
const DEFLECT_STATE_HOOKED          = 0x02;
const DEFLECT_STATE_FAILED          = 0x04;
const DEFLECT_STATE_ENQUEUED        = 0x08;
const DEFLECT_STATE_UNHOOKED        = 0x10;
const DEFLECT_STATE_DEQUEUED        = 0x20;

/**Create a hook structure to be queued and after attached.
 * 
 * @param {function} targFunc Target function to be hooked.
 * @param {function} newFunc New function that will replace the target function.
 * @param {number} hookType The hook type (DEFLECT_PRE_OPERATION_HOOK, DEFLECT_OVERWRITTEN_HOOK or DEFLECT_POST_OPERATION_HOOK).
 * @param {*} parent The parent object of target function (default: window).
 */
function deflect_create_hook(targFunc, newFunc, hookType, parent){
    let oldFunc = targFunc;
    let stub;
    if (typeof parent == "undefined" || parent == null){
        parent = window;
    }
    if (typeof hookType == "undefined"){
        hookType = DEFLECT_OVERWRITTEN_HOOK;
    }
    switch (hookType) {
        case DEFLECT_PRE_OPERATION_HOOK:
            stub = function defprehookstub() { newFunc.apply(this, arguments); return targFunc.apply(this, arguments); }
            break;
        case DEFLECT_OVERWRITTEN_HOOK:
            stub = function defoverhookstub() { return newFunc.apply(this, arguments); }
            break;
        case DEFLECT_POST_OPERATION_HOOK:
            stub = function defposthookstub() { let result = targFunc.apply(this, arguments); newFunc.apply(this, arguments); return result; }
            break;
        default:
            stub = function defoverhookstub() { return newFunc.apply(this, arguments); }
            break;
    }
    Object.defineProperty(stub, "name", {value: oldFunc.name});
    return {
        OriginalFunction: oldFunc,
        OriginalFunctionName: oldFunc.name,
        NewFunction: newFunc,
        Parent: parent,
        HookType: hookType,
        HookState: DEFLECT_STATE_WAITING,
        HookStub: stub,
        PatchAddr: targFunc,
        Guid: null
    };
}

/**Create a hook structure to be queued and after attached.
 * 
 * @param {*} targFunc Target function to be hooked.
 * @param {*} newFunc New function that will replace the target function.
 * @param {*} hookType The hook type (DEFLECT_NATIVE_PRE_OPERATION_HOOK, DEFLECT_NATIVE_OVERWRITTEN_HOOK or DEFLECT_NATIVE_POST_OPERATION_HOOK).
 * @param {*} parent The parent object of target function (default: window).
 */
function deflect_create_native_hook(targFunc, newFunc, hookType, parent){
    let oldFunc = targFunc;
    let struct = {
        OriginalFunction: oldFunc,
        OriginalFunctionName: oldFunc.name,
        NewFunction: newFunc,
        Parent: parent,
        HookType: hookType,
        HookState: DEFLECT_STATE_WAITING,
        HookStub: function(){},
        PatchAddr: targFunc,
        Guid: null
    }
    if (typeof parent == "undefined" || parent == null){
        parent = window;
    }
    if (typeof hookType == "undefined"){
        hookType = DEFLECT_NATIVE_OVERWRITTEN_HOOK;
    }
    switch (struct.HookType) {
        case DEFLECT_NATIVE_PRE_OPERATION_HOOK:
            struct.HookStub = function defntprehookstub() {
                newFunc.apply(this, arguments);
                deflect_unpatch_original(struct);
                let result = struct.Parent[struct.OriginalFunctionName].apply(this, arguments);
                deflect_patch_original(struct);
                return result;
            }
            break;
        case DEFLECT_NATIVE_OVERWRITTEN_HOOK:
            struct.HookStub = function defntoverhookstub() {
                return newFunc.apply(this, arguments);
            }
            break;
        case DEFLECT_NATIVE_POST_OPERATION_HOOK:
            struct.HookStub = function defntposthookstub() {
                deflect_unpatch_original(struct);
                let result = struct.Parent[struct.OriginalFunctionName].apply(this, arguments);
                deflect_patch_original(struct);
                newFunc.apply(this, arguments);
                return result;
            }
            break;
        default:
            struct.HookStub = function defntoverhookstub() {
                return newFunc.apply(this, arguments);
            }
            break;
    }
    Object.defineProperty(struct.HookStub, "name", {value: oldFunc.name});
    return struct;
}

/**Generate a GUID (Global Unique Identifier) for hooks.
 * 
 */
function deflect_generate_guid(){
    let charkeys = "0123456789abcdef";
    let uuid = "";
    for (let j = 0; j < 8; j++){
        uuid += charkeys.charAt(Math.floor(Math.random() * (charkeys.length)));
    }
    uuid += "-";
    for (let i = 0; i < 3; i++){
        for (let j = 0; j < 4; j++){
            uuid += charkeys.charAt(Math.floor(Math.random() * (charkeys.length)));
        }
        uuid += "-";
    }
    for (let j = 0; j < 12; j++){
        uuid += charkeys.charAt(Math.floor(Math.random() * (charkeys.length)));
    }
    return uuid.toUpperCase();
}

/**Add the hook in queue to be attached.
 * 
 * @param {*} hookStruct Hook structure returned in deflect_create_hook(...) function.
 * @param {Array} queueHook The array containing the hooks.
 */
function deflect_enqueue_hook(hookStruct, queueHook){
    if (typeof queueHook == "undefined"){
        hookStruct.HookState = DEFLECT_STATE_FAILED;
        return DEFLECT_STATE_FAILED;
    }
    if (queueHook == null){
        queueHook = [];
        hookStruct.Guid = deflect_generate_guid();
    }
    let bFlag = true;
    let guid;
    while (bFlag){
        bFlag = false;
        guid = deflect_generate_guid();
        for (let k = 0; k < queueHook.length; k++){
            if (queueHook[k].Guid == guid){
                bFlag = true;
            }
        }
    }
    hookStruct.Guid = guid;
    hookStruct.HookState = DEFLECT_STATE_ENQUEUED;
    queueHook.push(hookStruct);
    return DEFLECT_STATE_ENQUEUED;
}

/**Remove the hook of queue.
 * 
 * @param {string} hookGuid The Global Unique Identifier (GUID) of hook in queue.
 * @param {Array} queueHook The array containing the hooks.
 */
function deflect_dequeue_hook(hookGuid, queueHook){
    for (let k = 0; k < queueHook.length; k++){
        if (queueHook[k].Guid == hookGuid){
            queueHook.splice(k, 1);
            queueHook[k].HookState = DEFLECT_STATE_DEQUEUED;
            return DEFLECT_STATE_DEQUEUED;
        }
    }
    return DEFLECT_STATE_FAILED;
}

/**Attach all hooks to their target functions.
 * 
 * @param {Array} queueHook The array containing the hooks.
 */
function deflect_attach_hook(queueHook){
    if (typeof queueHook == "undefined" || queueHook == null){
        return DEFLECT_STATE_FAILED;
    }
    for (let k = 0; k < queueHook.length; k++){
        queueHook[k].Parent[queueHook[k].OriginalFunctionName] = queueHook[k].HookStub;
        queueHook[k].HookState = DEFLECT_STATE_HOOKED;
    }
    return DEFLECT_STATE_HOOKED;
}

/**Detach all hooks of their target functions.
 * 
 * @param {Array} queueHook The array containing the hooks.
 */
function deflect_detach_hook(queueHook){
    if (typeof queueHook == "undefined" || queueHook == null){
        return DEFLECT_STATE_FAILED;
    }
    for (let k = 0; k < queueHook.length; k++){
        queueHook[k].Parent[queueHook[k].OriginalFunctionName] = queueHook[k].OriginalFunction;
        queueHook[k].HookState = DEFLECT_STATE_UNHOOKED;
    }
    return DEFLECT_STATE_UNHOOKED;
}

/**Patch the original function.
 * 
 * @param {*} hookStruct Hook structure returned in deflect_create_hook(...) function.
 */
function deflect_patch_original(hookStruct){
    if (hookStruct.HookType != DEFLECT_NATIVE_PRE_OPERATION_HOOK &&
        hookStruct.HookType != DEFLECT_NATIVE_OVERWRITTEN_HOOK &&
        hookStruct.HookType != DEFLECT_NATIVE_POST_OPERATION_HOOK) {
        hookStruct.HookState = DEFLECT_STATE_FAILED;
        return DEFLECT_STATE_FAILED;
    }
    hookStruct.OriginalFunction = hookStruct.Parent[hookStruct.OriginalFunctionName];
    hookStruct.Parent[hookStruct.OriginalFunctionName] = hookStruct.HookStub;
    hookStruct.HookState = DEFLECT_STATE_HOOKED;
    return DEFLECT_STATE_HOOKED;
}

/**Unpatch the original function.
 * 
 * @param {*} hookStruct Hook structure returned in deflect_create_hook(...) function.
 */
function deflect_unpatch_original(hookStruct){
    if (hookStruct.HookType != DEFLECT_NATIVE_PRE_OPERATION_HOOK &&
        hookStruct.HookType != DEFLECT_NATIVE_OVERWRITTEN_HOOK &&
        hookStruct.HookType != DEFLECT_NATIVE_POST_OPERATION_HOOK) {
        hookStruct.HookState = DEFLECT_STATE_FAILED;
        return DEFLECT_STATE_FAILED;
    }
    hookStruct.HookStub = hookStruct.Parent[hookStruct.OriginalFunctionName];
    hookStruct.Parent[hookStruct.OriginalFunctionName] = hookStruct.OriginalFunction;
    hookStruct.HookState = DEFLECT_STATE_UNHOOKED;
    return DEFLECT_STATE_UNHOOKED;
}