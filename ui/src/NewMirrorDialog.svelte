<script lang="ts">
  import type { TablesStore } from './store';
  import { getContext } from 'svelte';
  import type { Variable, MirrorState } from './mirror';
  import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
  import '@shoelace-style/shoelace/dist/components/button/button.js';
  import '@shoelace-style/shoelace/dist/components/input/input.js';
  import type SlDialog from '@shoelace-style/shoelace/dist/components/dialog/dialog';

  let dialog: SlDialog
  let nameInput;

  $: name = ""

  const { getStore } :any = getContext('store');

  const store:TablesStore = getStore();

  const styleTag = 'style';
  const scriptTag = 'script';
  const defaultTemplate = [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '  <' + styleTag + '>',
    '    body {',
    '      font-family: Arial, sans-serif;',
    '      padding: 20px;',
    '    }',
    '  </' + styleTag + '>',
    '</head>',
    '<body>',
    '  <h1>New View</h1>',
    '  <p>Start editing to create your custom view.</p>',
    '  ',
    '  <' + scriptTag + '>',
    '    // Your JavaScript here',
    '  </' + scriptTag + '>',
    '</body>',
    '</html>'
  ].join('\n');

  const addMirror = async () => {
      const state:Partial<MirrorState> = {name, variables: [], raw: defaultTemplate}
      state.feed = {}
      const mirror = await store.mirrorList.makeMirror(state)
      await mirror.join()
      store.setUIprops({showMenu:false})
      dialog.hide()
      await store.mirrorList.setActiveMirror(mirror.hash)
      // Open in edit mode if flag is set
      if (openInEditMode) {
        store.setUIprops({openMirrorInEditMode: true});
        openInEditMode = false; // Reset the flag
      }
      // Reset form
      name = "";
  }
  
  let openInEditMode = false;
  
  export const open = (editMode = false)=> {
      openInEditMode = editMode;
      name = "";
      dialog.show()
  }

</script>
<sl-dialog bind:this={dialog} label="New View"
    on:sl-initial-focus={(e)=>{
        nameInput.focus()
        e.preventDefault()
    }}>

    <div class='mirror-form'>
      <sl-input 
        bind:this={nameInput} 
        placeholder="Enter view title" 
        maxlength="60" 
        value={name} 
        on:sl-input={e => name = e.target.value}
      ></sl-input>
    </div>

    <div slot="footer" class="dialog-footer">
      <sl-button variant="default" on:click={()=>dialog.hide()}>Cancel</sl-button>
      <sl-button variant="primary" on:click={addMirror} disabled={!name.trim()}>Create View</sl-button>
    </div>
</sl-dialog>

<style>
  .mirror-form {
    padding: 20px 0;
  }
  
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
</style>