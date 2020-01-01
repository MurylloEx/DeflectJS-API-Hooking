# DeflectJS API - Hooking
Make it easier to hook APIs and functions into javascript.

### Get started into DeflectJS Hooking Engine

Our example will show how to change the behavior of the console.log function using a replacement hook.

The console.log by default display a text parameter specified in log(str). Let's change the real output to "Hooked: " + str. When the user call console.log(str) again will display a string "Hooked: " + str. Thus, console.log("Test!") gives "Hooked: Test!" instead of "Test!".

```
Original output when calling console.log
```

<p align="left">
    <img src="https://i.imgur.com/Su9MVXi.png" alt="Hooked: Test!" style="display:block;">
</p>

### Hooking the function console.log using DeflectJS Hooking Engine

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
```
After hooking the console.log api, let's see what happens when you call it.
```
```javascript
//Now, let's see what happens when call console.log
console.log("Test!");
```
```
And our result will be:
```
<p align="left">
    <img src="https://i.imgur.com/LUtyZEM.png" alt="Hooked: Test!" style="display:block;">
</p>

### Unhooking the function console.log using DeflectJS Hooking Engine
```javascript
if (deflect_detach_hook(hookQueue) == DEFLECT_STATE_UNHOOKED){
    alert('Successful unhooked!');
}
```
