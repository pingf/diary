// this calls the Ollama Completion API without token by token streaming
function getOllamaCompletionCallback(chatInstance, userInput) {
  chatInstance.messageAddNew(userInput, "user", "right"); // echos the user input to the chat
  return fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-r1:14b",
      prompt: systemPrompt + userInput,
      stream: false,
    }),
    credentials: "include",
    mode: "cors",
    cache: "no-cache",
  })
    .then((response) => response.json())
    .then((data) => {
      chatInstance.messageAddNew(data.response.trim(), "Pupu", "left"); //  display the bot's response
    })
    .catch((error) => console.error("Error:", error));
}

// this calls the Ollama Streaming API with token streaming
function getOllamaStreamingCallback(chatInstance, userInput) {
  var fetchedData = [];
  let start = true;
  chatInstance.messageAddNew(userInput, "user", "right"); // echos the user input to the chat
  return fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-r1:14b",
      prompt: systemPrompt + userInput,
      stream: true,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.body.getReader();
    })
    .then((reader) => {
      let partialData = "";
      let id;

      // Read and process the NDJSON response
      return reader.read().then(function processResult(result) {
        if (result.done) {
          return;
        }

        partialData += new TextDecoder().decode(result.value, {
          stream: true,
        });
        const lines = partialData.split("\n");

        for (let i = 0; i < lines.length - 1; i++) {
          const json = JSON.parse(lines[i]);
          const content = json.response;
          if (start) {
            id = chatInstance.messageAddNew(content, "Pupu", "left"); // start a new chat message
            start = false;
          } else {
            chatInstance.messageAppendContent(id, content); // append new content to message
          }
        }
        partialData = lines[lines.length - 1];

        return reader.read().then(processResult);
      });
    })
    .then(() => {
      // At this point, fetchedData contains all the parsed JSON objects
      //console.log(fetchedData); // use this to see the entire response
    })
    .catch((error) => {
      console.error("Fetch error:", error);
    });
}

async function getOpenAICallback(chatInstance, userInput) {
  const apiKey = "xxxxxxxxx";
  const baseUrl = "https://api.openai.com/v1/chat/completions";
  const prompt = "I'm Pupu,a cute & lovely little girl,tell me a story";
  const responseDiv = document.getElementById("response");
  responseDiv.innerHTML = "";
  chatInstance.messageAddNew(userInput, "user", "right");
  const data = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: prompt }, // this is the base prompt
      ...chatInstance.historyGet(), // get the chat history and add it to the prompt
    ],
    temperature: 0.5,
    max_tokens: 2050,
    stream: true,
  };

  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let done = false;
    let accumulated = "";
    let start = true;
    let id;
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      accumulated += decoder.decode(value, { stream: true });
      let lines = accumulated.split("\n");

      // Process each line, except the last one, which might be incomplete
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (line.startsWith("data: ")) {
          const jsonString = line.slice(6);
          if (jsonString !== "[DONE]") {
            try {
              const json = JSON.parse(jsonString);
              if (json.choices && json.choices.length > 0) {
                //responseDiv.innerHTML += json.choices[0].delta.content || '';
                let content = json.choices[0].delta.content;
                if (start) {
                  id = chatInstance.messageAddNew(content, "bot", "left");
                  start = false;
                } else {
                  if (content) chatInstance.messageAppendContent(id, content);
                }
              }
            } catch (e) {
              console.error("Error parsing JSON:", e);
            }
          }
        }
      }
      // Keep the last line for further processing
      accumulated = lines[lines.length - 1];
    }
  } catch (error) {
    console.error("Error streaming tokens:", error);
    responseDiv.innerHTML = `<span style="color: red;">${error.message}</span>`;
  }
}

function getDeepSeekStreamingCallback(chatInstance, userInput) {
  const apiKey =  document.getElementById('keySelect').value || localStorage.getItem("keySelect")
  localStorage.setItem("keySelect", apiKey)
  var fetchedData = [];
  let start = true;
  let answer = false;
  chatInstance.messageAddNew(userInput, "user", "right"); // echos the user input to the chat

  const history = chatInstance.historyGetAllCopy();
  let lastMessageFromUser = false
  if (history) {
    let messages = [{role: 'system', content: chatInstance._meta.systemPrompt}]
    history.slice(1).forEach((e) => {
      messages.push({ role: e.role, content: e.content })
      if (e.role === 'user') {
        lastMessageFromUser = true;
      } else {
        lastMessageFromUser = false;
      }
    });
    chatInstance._meta.messages = messages
    // chatInstance._meta.messages.push({ role: "assitant", content: assitant })
  }
  if (!lastMessageFromUser) return;
  // chatInstance._meta.messages.push({ role: "user", content: userInput })
  return fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-reasoner",
      messages: chatInstance._meta.messages,
      stream: true,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.body.getReader();
    })
    .then((reader) => {
      let partialData = "";
      let id;

      // Read and process the NDJSON response
      return reader.read().then(function processResult(result) {
        if (result.done) {
          return;
        }

        partialData += new TextDecoder().decode(result.value, {
          stream: true,
        });
        const lines = partialData.split("\n");

        for (let i = 0; i < lines.length - 1; i++) {
          if (lines[i].startsWith('data: {"')) {
            const r = lines[i].slice(6);
            const resp = JSON.parse(r);
            if (resp.choices) {
              const content = resp.choices.reduce((acc, cur) => {
                if (!answer) {
                  if (cur.delta?.reasoning_content !== null) {
                    return acc + cur.delta.reasoning_content;
                  } else if (cur.delta?.content !== null) {
                    answer = true;
                    return acc + "\n\n" + "answer" + ":\n" + cur.delta.content;
                  } else {
                    answer = true;
                    return acc + "\n\n" + "answer" + ":\n";
                  }
                } else {
                  if (cur.delta.content) {
                    return acc + cur.delta.content;
                  }
                }
                return acc;
              }, "");
              if (start) {
                let txt = "think" + ":\n";
                if (content !== null) {
                  txt = txt + content;
                }
                id = chatInstance.messageAddNew(txt, "Pupu", "left", role='assistant'); // start a new chat message
                start = false;
              } else {
                if (content !== null) {
                  chatInstance.messageAppendContent(id, content, role='assistant'); // append new content to message
                }
              }
            }
          }
        }
        partialData = lines[lines.length - 1];
        return reader.read().then(processResult);
      });
    })
    .then(() => {
      // At this point, fetchedData contains all the parsed JSON objects
      //console.log(fetchedData); // use this to see the entire response
    })
    .catch((error) => {
      console.error("Fetch error:", error);
    });
}
