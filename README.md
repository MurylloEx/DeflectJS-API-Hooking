# DeflectJS API - Hooking
 Make it easier to hook APIs and functions into javascript.

```javascript
var hookStruct; //Struct that contains our hook data.
var hookQueue = []; //Queue where our hook will be added.

//Function that will replace the current console.log
function hookedLog(text){
    return hookStruct.OriginalFunction("Hooked: " + text);
}

//Creating the stub that will intercept calls for console.log
hookStruct = deflect_create_hook(console.log, hookedLog, DEFLECT_OVERWRITTEN_HOOK, console);

//Adding the hooks in the queue to be attached.
if (deflect_enqueue_hook(hookStruct, hookQueue) != DEFLECT_STATE_ENQUEUED){
    alert('Error!');
}

//Attaching all hooks in queue.
if (deflect_attach_hook(hookQueue) != DEFLECT_STATE_HOOKED){
    alert('Error!');
}
```
