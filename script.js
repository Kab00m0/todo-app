if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js")
      .then(() => console.log("Service Worker registriert"))
      .catch((err) => console.error("Fehler beim Registrieren:", err));
  }


//--------------------------------------------------------------------------------------------------//
const todoContainer = document.getElementById("to-do-container")
const errorMessage = document.querySelector(".error-message")
const inputTodo = document.querySelector(".input")
const dailyButton = document.querySelector(".daily-list")
const weeklyButton = document.querySelector(".weekly-list")
const monthlyButton = document.querySelector(".monthly-list")
const timeframeHeader = document.querySelector(".timeframe-headline")

let currentToDoList = "daily"
let draggedItem = null

document.addEventListener("DOMContentLoaded", () => {
    //localStorage.clear()
    removeOldTodos()
    renderTodos(currentToDoList)
});

dailyButton.addEventListener("click", () => changeToDoList("Daily", dailyButton, weeklyButton, monthlyButton))

weeklyButton.addEventListener("click", () => changeToDoList("Weekly", weeklyButton, dailyButton, monthlyButton))

monthlyButton.addEventListener("click", () => changeToDoList("Monthly", monthlyButton, weeklyButton, dailyButton))

function changeToDoList(newText, add, remove1, remove2) {
    add.classList.add("active")
    remove1.classList.remove("active")
    remove2.classList.remove("active")

    currentToDoList = newText.toLowerCase()
    timeframeHeader.classList.add("fade-out");

    setTimeout(() => {
        timeframeHeader.textContent = newText;
        timeframeHeader.classList.remove("fade-out");
    }, 200);

    renderTodos()
}


//--------------------------------------------------------------------------------------------------------------//
// Drag and drop
todoContainer.addEventListener("dragstart", (e) => {
    if (e.target.classList.contains("to-do-item")) {
        draggedItem = e.target; // Speichere das gezogene Element
        e.target.classList.add("dragging");
    }
});

todoContainer.addEventListener("dragend", (e) => {
    if (e.target.classList.contains("to-do-item")) {

        e.target.classList.remove("dragging");
        draggedItem = null;
    }
});

todoContainer.addEventListener("dragover", (e) => {
    e.preventDefault(); // Erlaubt das Ablegen
    const draggingOver = e.target;

    // Verhindere, dass andere Elemente als To-Dos markiert werden
    if (!draggingOver.classList.contains("to-do-item")) return;

    // Füge visuelles Feedback hinzu
    draggingOver.classList.add("over");

    // Entferne das Feedback, wenn das Dragged-Element verschoben wird
    todoContainer.addEventListener("dragleave", () => {
        draggingOver.classList.remove("over");
    });
});

todoContainer.addEventListener("drop", (e) => {
    e.preventDefault();
    const dropTarget = e.target;

    // Sicherstellen, dass wir auf einem To-Do ablegen
    if (!dropTarget.classList.contains("to-do-item")) return;

    handleDragAndDrop(getIdFromElement(draggedItem), getIdFromElement(dropTarget)) 
    dropTarget.classList.remove("over");

    // Neue Position berechnen und Element verschieben
    const allTodos = Array.from(todoContainer.children);
    const dropIndex = allTodos.indexOf(dropTarget);
    const dragIndex = allTodos.indexOf(draggedItem);

    // Verschiebe das Element vor oder nach dem Ziel
    if (dragIndex < dropIndex) {
        dropTarget.insertAdjacentElement("afterend", draggedItem);
    } else {
        dropTarget.insertAdjacentElement("beforebegin", draggedItem);
    }
});

function handleDragAndDrop(draggedId, targetId) {
    // Finde die Indizes des verschobenen und des Ziel-Elements
    const draggedIndex = getTodoIndexById(draggedId);
    const targetIndex = getTodoIndexById(targetId);
    const allTodos = loadFromLocalStorage()
    let todos = allTodos[currentToDoList]
  
    if (draggedIndex === -1 || targetIndex === -1) return
    // Entferne das verschobene Objekt aus dem Array
    const [draggedTodo] = todos.splice(draggedIndex, 1);
  
    // Füge das Objekt an die neue Position ein
    todos.splice(targetIndex, 0, draggedTodo);


    if (draggedIndex < targetIndex) {
        // Nach unten verschieben
        for (let i = draggedIndex; i <= targetIndex; i++) {
          todos[i].pos = i;
        }
    } else if (draggedIndex > targetIndex) {
        // Nach oben verschieben
        for (let i = targetIndex; i <= draggedIndex; i++) {
          todos[i].pos = i;
        }
    }
    
      // Nummerierung im DOM mit Verzögerung aktualisieren
    todos.forEach(todo => {
        const todoElement = document.querySelector(`[data-id="${todo.id}"]`);
        if (todoElement) {
            const numberElement = todoElement.querySelector(".to-do-number span");
    
            // Animation starten
            numberElement.classList.add("updating");
    
            setTimeout(() => {
                // Nummerierung aktualisieren
                numberElement.textContent = todo.pos + 1; // Nutzt die aktualisierte Position
                numberElement.classList.remove("updating");
            }, 200); // Verzögerung für die Animation
        }
    })

    allTodos[currentToDoList] = todos

    saveToLocalStorage(allTodos)
}














//--------------------------------------------------------------------------------------------------------------//

//helper functions
function getTodoElementById(id) {
    return document.querySelector(`[data-id="${id}"]`);
}

function getTodoIndexById(id) {
    const allTodos = loadFromLocalStorage()
    let todos = allTodos[currentToDoList]
    return todos.findIndex(todo => todo.id === id);
}

function getIdFromElement(element) {
    const id = element.getAttribute("data-id");
    return id ? parseInt(id, 10) : null; // Gibt die ID als Zahl zurück oder null, falls keine vorhanden
  }


function isSameTimePeriod(timestamp, timeperiod) {
    const todoDate = new Date(timestamp);
    const now = new Date();

    switch (timeperiod) {
        case "day":
            return (
                todoDate.getFullYear() === now.getFullYear() &&
                todoDate.getMonth() === now.getMonth() &&
                todoDate.getDate() === now.getDate()
            );

        case "week":
            const getWeekNumber = (date) => {
                const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
                const pastDaysOfYear = Math.floor((date - firstDayOfYear) / 86400000);
                return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
            };

            return (
                todoDate.getFullYear() === now.getFullYear() &&
                getWeekNumber(todoDate) === getWeekNumber(now)
            );

        case "month":
            return (
                todoDate.getFullYear() === now.getFullYear() &&
                todoDate.getMonth() === now.getMonth()
            );

        default:
            console.warn("Unbekannter Zeitraum:", timeperiod);
            return false;
    }
}

function removeOldTodos() {
    let todos = loadFromLocalStorage();

    todos.daily = (todos.daily || []).filter(todo => isSameTimePeriod(todo.id, "day") || !todo.checkStatus)

    todos.daily.forEach((todo, index) => {
        todo.pos = index
    })

    todos.weekly = (todos.weekly || []).filter(todo => isSameTimePeriod(todo.id, "week") || !todo.checkStatus)

    todos.weekly.forEach((todo, index) => {
        todo.pos = index
    })

    todos.monthly = (todos.monthly || []).filter(todo => isSameTimePeriod(todo.id, "month") || !todo.checkStatus)

    todos.monthly.forEach((todo, index) => {
        todo.pos = index
    })

    saveToLocalStorage(todos);
}

//Einzufügen für später mit Local Storage renderToDos, meiste Funktionen können dann aus addToDo() verwendet werden, muss nur durch gespeicherte ToDos geloopt werden.
function renderTodos() {
    const allTodos = loadFromLocalStorage()
    let todos = allTodos[currentToDoList] || []

    todoContainer.innerHTML = ""

    todos.forEach(todo => {
        createHTMLToDoElement(todo.pos+1, todo.content, todo.id, todo.checkStatus)
    });
}

function saveToLocalStorage(todos) {
    localStorage.setItem("todos", JSON.stringify(todos))
}

function loadFromLocalStorage() {
    const todos = localStorage.getItem("todos");
    return todos ? JSON.parse(todos) : { daily: [], weekly: [], monthly: [] };
}













//--------------------------------------------------------------------------------------------------------------//

function addToDo(){
    let allTodos = loadFromLocalStorage()
    let todos = allTodos[currentToDoList]

    //check input value
    let inputValue = inputTodo.value

    if(inputValue === "")
    {
        errorMessage.classList.add("visible")
        return
    }

    errorMessage.classList.remove("visible")

    //Create new To-do-item

    const newToDoID = Date.now()

    createHTMLToDoElement(todos.length+1, inputValue, newToDoID)

    let newToDoObject = {
        id: newToDoID, 
        content: inputValue, 
        pos: todos.length,
        checkStatus: false
    }
   
    todos.push(newToDoObject)
    allTodos[currentToDoList] = todos
    saveToLocalStorage(allTodos)

    inputTodo.value = ""
}

function createHTMLToDoElement(number, content, id, checkStatus)
{
    //create wrapper
    let newToDoItem = document.createElement("div")
    newToDoItem.classList.add("to-do-item")
    newToDoItem.draggable = true
    newToDoItem.setAttribute("data-id", id);

    //create left part of wrapper
    let newToDoLeft = document.createElement("div")
    newToDoLeft.classList.add("to-do-left")

    //create number of To-do
    let newToDoNumber = document.createElement("div")
    let newToDoNumberSpan = document.createElement("span")
    newToDoNumberSpan.textContent = number.toString()

    newToDoNumber.classList.add("to-do-number")
    newToDoNumber.appendChild(newToDoNumberSpan)

    //create To-do-content-wrapper
    let newToDoContentWrapper = document.createElement("div")
    newToDoContentWrapper.classList.add("to-do-content")

    //create to-do-text
    let newToDoText = document.createElement("span")
    newToDoText.textContent = content
    newToDoText.classList.add("to-do-text")

    //create button-container
    let newToDoButtonContainer = document.createElement("div")
    newToDoButtonContainer.classList.add("button-container")

    //create Buttons
    let newToDoEditButton = document.createElement("button")
    newToDoEditButton.classList.add("button", "edit-button", "fa", "fa-edit")

    newToDoEditButton.addEventListener("click", (event) => {
        enableEditing(event.target, id)
    })
    
    let newToDoDeleteButton = document.createElement("button")
    newToDoDeleteButton.addEventListener("click", (event) => {
        makeInvisible(event.target)
        setTimeout(() => deleteToDo(event.target, id), 600)
    })
    newToDoDeleteButton.classList.add("button", "delete-button", "fa", "fa-trash-o")

    //create Checkbox
    let newToDoCheckbox = document.createElement("input")
    newToDoCheckbox.type = "checkbox"
    newToDoCheckbox.classList.add("to-do-checkbox")
    newToDoCheckbox.checked = checkStatus
    newToDoCheckbox.addEventListener("change", (event) => {
        changeCheckStatus(event.target, id)
    })

    //append all Elements in correct order

    newToDoButtonContainer.appendChild(newToDoEditButton)
    newToDoButtonContainer.appendChild(newToDoDeleteButton)

    newToDoContentWrapper.appendChild(newToDoText)
    newToDoContentWrapper.appendChild(newToDoButtonContainer)

    newToDoLeft.appendChild(newToDoNumber)
    newToDoLeft.appendChild(newToDoContentWrapper)

    newToDoItem.appendChild(newToDoLeft)
    newToDoItem.appendChild(newToDoCheckbox)
    todoContainer.append(newToDoItem)
}

function makeInvisible(element){
    let item = element.closest(".to-do-item")
    const itemHeight = item.offsetHeight;

    // Setze die Höhe explizit, um den Übergang zu ermöglichen
    item.style.height = `${itemHeight}px`;

    const gap = 20

    // Füge eine kurze Verzögerung ein, um den Übergang sichtbar zu machen
    requestAnimationFrame(() => {
      item.style.height = "0"
      item.style.opacity = "0"
      item.style.margin = `${-1/2*gap}px`
      item.style.padding = "0"
      item.style.border = "none"
    })
}

function changeCheckStatus(element, id)
{
    const allTodos = loadFromLocalStorage()
    let todos = allTodos[currentToDoList]

    let index = todos.findIndex(todo => todo.id === id)

    todos[index].checkStatus = !todos[index].checkStatus
    allTodos[currentToDoList] = todos
    saveToLocalStorage(allTodos)
}

function deleteToDo(element, id){
    const allTodos = loadFromLocalStorage()
    let todosArray = allTodos[currentToDoList]

    let index = todosArray.findIndex(todo => todo.id === id)

    if (index === -1) return

    todosArray.splice(index, 1)

    for (let i = index; i < todosArray.length; i++) {
        todosArray[i].pos--
    }

    let item = element.closest(".to-do-item")
    
    item.remove()

    const todos = document.querySelectorAll("#to-do-container .to-do-item")

    for(let i = index; i<todos.length; i++){
        let todo = todos[i]
        todosArray[i].pos = i
        const numberElement = todo.querySelector(".to-do-number span")

        numberElement.classList.add("updating")

        setTimeout(() => {
            numberElement.textContent = todosArray[i].pos + 1
            numberElement.classList.remove("updating")
        }, 200) 
    }


    allTodos[currentToDoList] = todosArray

    saveToLocalStorage(allTodos)
}

function enableEditing(element, id) {
    const parentNode = element.closest(".to-do-content")
    const textElement = parentNode.querySelector(".to-do-text")
    // Setzt das contenteditable Attribut auf true, um den Text bearbeitbar zu machen
    textElement.setAttribute("contenteditable", "true")
    textElement.focus() // Setzt den Fokus auf das Textfeld
    // Ändert den Text des Buttons, wenn er geklickt wurde
    element.classList.add("editing")
    // Event-Listener für den "Speichern"-Button
    element.removeEventListener("click", enableEditing)
    element.addEventListener("click", (event) => {
        saveText(event.target, id)
    })
}

// Funktion, um den bearbeiteten Text zu speichern
function saveText(element, id) {
    const parentNode = element.closest(".to-do-content")
    const textElement = parentNode.querySelector(".to-do-text")

    let allTodos = loadFromLocalStorage()
    let todosArray = allTodos[currentToDoList]
    todosArray.find(todo => todo.id === id).content = textElement.textContent
    // Setzt das contenteditable Attribut wieder auf false, um das Bearbeiten zu deaktivieren
    textElement.setAttribute("contenteditable", "false")

    element.classList.remove("editing")
    // Event-Listener für den "Bearbeiten"-Button zurücksetzen
    element.removeEventListener("click", saveText);
    element.addEventListener("click", (event) => {
        enableEditing(event.target)
    })

    allTodos[currentToDoList] = todosArray
    saveToLocalStorage(allTodos)
}







//Button functions

const toggleBtn = document.querySelector(".toggle-menu")
const lines = document.querySelectorAll(".line")
const navbar = document.querySelector(".navbar")
const overlay = document.querySelector(".overlay")
const darkmodeBtn = document.querySelector(".toggle-dark-mode")
const body = document.querySelector("body")

toggleBtn.addEventListener("click", () => {
    navbar.classList.toggle("open")
    overlay.classList.toggle("visible")

    lines[0].classList.toggle("top-line-selected")
    lines[1].classList.toggle("middle-line-selected")
    lines[2].classList.toggle("bottom-line-selected")
})

overlay.addEventListener("click", () => {
    navbar.classList.remove("open")
    overlay.classList.remove("visible")

    lines[0].classList.toggle("top-line-selected")
    lines[1].classList.toggle("middle-line-selected")
    lines[2].classList.toggle("bottom-line-selected")
})

darkmodeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
})