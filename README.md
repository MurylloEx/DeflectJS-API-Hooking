# DeflectJS API - Hooking
 Make it easier to hook APIs and functions into javascript.

```javascript
var hookStruct; //Estrutura contendo os dados referentes ao gancho.
var hookQueue = []; //Fila de ganchos a serem anexados.

//Função substituta do SysShowEventAsync.
function hookedLog(text){
    return hookStruct.OriginalFunction("Hooked: " + text);
}

//Criando o desvio (stub de interceptação da função original).
hookStruct = deflect_create_hook(SysShowEventAsync, hookedSysShowEventAsync, DEFLECT_OVERWRITTEN_HOOK);

//Adicionando o gancho para a fila de ganchos a serem anexados.
if (deflect_enqueue_hook(hookStruct, hookQueue) != DEFLECT_STATE_ENQUEUED){
    alert('Erro!');
}

//Anexando todos os ganchos da fila.
if (deflect_attach_hook(hookQueue) != DEFLECT_STATE_HOOKED){
    alert('Erro!');
}
```
