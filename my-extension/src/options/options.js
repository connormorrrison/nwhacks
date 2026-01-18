document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('llm_api_key');
  const endpointInput = document.getElementById('llm_endpoint');
  const modelInput = document.getElementById('llm_model');
  const systemPromptInput = document.getElementById('llm_system_prompt');
  const saveBtn = document.getElementById('save-btn');

  // load
  chrome.storage.local.get(['llm_api_key','llm_endpoint','llm_model','llm_system_prompt'], (res) => {
    apiKeyInput.value = res.llm_api_key || '';
    endpointInput.value = res.llm_endpoint || '';
    modelInput.value = res.llm_model || '';
    systemPromptInput.value = res.llm_system_prompt || '';
  });

  saveBtn.onclick = () => {
    chrome.storage.local.set({
      llm_api_key: apiKeyInput.value.trim(),
      llm_endpoint: endpointInput.value.trim(),
      llm_model: modelInput.value.trim(),
      llm_system_prompt: systemPromptInput.value.trim()
    }, () => {
      const s = document.getElementById('saved');
      s.textContent = 'Saved.';
      setTimeout(() => s.textContent = '', 2000);
    });
  };
});
