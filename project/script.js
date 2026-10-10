const dropdown = document.getElementById('deparments');
const btn = document.getElementById('submit'); 
let deptChoiceId; 


getDepts();



//need a const that stores the user's dropdown choice's corresponding deptID 


//const deptIdChoice = dropdown.addEventListener(); ??? 

btn.addEventListener('click', 
    () => getArt()); 



function displayArt(artTitle,  artist, dept, date){
        const art_title = document.getElementById('art-title');
        art_title.textContent = `Title: ${artTitle}`

        const artist_name =document.getElementById('art-artist');
        artist_name.textContent = `Artist Name: ${artist}`

        const art_dept =document.getElementById('art-dept');
        art_dept.textContent = `Artist Deparment: ${dept}`

        const art_date = document.getElementById('art-date');
        art_date.textContent = `Date: ${date}`
   }

   
//https://collectionapi.metmuseum.org/public/collection/v1/objects/{objectID}
async function getArt()
{
   try{
        const res = await fetch('https://collectionapi.metmuseum.org/public/collection/v1/objects/45734');
    const data = await res.json(); //necessary to extract the body (res comes with res.status, res,ok, etc )

    // https://collectionapi.metmuseum.org/public/collection/v1/objects?departmentIds={deptIdChoice}
// from that store response.objectIDs in an arrat 
//write a loop that iteratures through the object ids and displays the info for them

   console.log(data); 
   const {title, artistDisplayName, department,  objectDate} = data;
   displayArt(title,artistDisplayName, department, objectDate ); 
  
   }
   catch (error){
        console.log('oopsies!', error);
   }

}


async function getDepts(){
        try{
                const deptsRes = await fetch('https://collectionapi.metmuseum.org/public/collection/v1/departments');
        const deptData = await deptsRes.json();
        console.log(deptData);

        for (const dept of deptData.departments) {
                // 1. Create an <option> element
            const option = document.createElement('option');

                // 2. Set its value to dept.departmentId
            option.value = dept.departmentId;
        
                // 3. Set its textContent to dept.displayName
            option.textContent = dept.displayName; 
                // 4. Append it to your dropdown
                dropdown.appendChild(option);
            }

        dropdown.addEventListener('change', ()=>{
            deptChoiceId = dropdown.value; 
            console.log(deptChoiceId); 
        }); 

        
    
        

        } catch (error){
                console.log('oops! no depts returned', error); 
        }

        
}


