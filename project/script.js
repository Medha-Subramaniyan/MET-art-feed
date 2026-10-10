getDepts();

const dropdown = document.getElementById('deparments');
const btn = document.getElementById('submit'); 

btn.addEventListener('click', 
    () => getArt()); 

function displayArt(artTitle, artist, date){
        const art_title = document.getElementById('art-title');
        art_title.textContent = `Title: ${artTitle}`

        const artist_name =document.getElementById('art-artist');
        artist_name.textContent = `Artist Name: ${artist}`

        const art_date = document.getElementById('art-date');
        art_date.textContent = `Date: ${date}`
   }

   
//https://collectionapi.metmuseum.org/public/collection/v1/objects/{objectID}
async function getArt()
{
   try{
        const res = await fetch('https://collectionapi.metmuseum.org/public/collection/v1/objects/45734');
    const data = await res.json(); //necessary to extract the body (res comes with res.status, res,ok, etc )
   console.log(data); 
   const {title, artistDisplayName, objectDate} = data;
   displayArt(title,artistDisplayName, objectDate ); 
  
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

        } catch (error){
                console.log('oops! no depts returned', error); 
        }

        
}
//getElementbyId('deparments')
//need 21 value="dept2" options , 1 for each department
// for x of 19 , value="dept{x}" = dept.displayName



//create a new js object looping thru deparments and
//  building up our own array [{departments.departmentId, departments.displayName}, ..] 

//create a new html element, then assign from the array 

//theres 2 key value pairs per 1 deparment