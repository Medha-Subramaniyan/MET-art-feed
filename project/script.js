console.log('hello'); 

const dropdown = document.getElementById('deparments');
const btn = document.getElementById('submit'); 

btn.addEventListener('click', 
    () => { const option = dropdown.selectedOptions[0];
            const choice = option.text; 
            console.log(choice); 
    }); 


