const dropdown = document.getElementById('deparments');
const btn = document.getElementById('submit'); 


getDepts();

btn.addEventListener('click', async () => {
    const deptChoiceId = dropdown.value;
    const artId = await getDeptPieces(deptChoiceId);
    await getArt(artId);
});


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

async function getDeptPieces(deptChoiceId)
{
    try
    {
        const resp = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1.1/search?departmentId=${deptChoiceId}&q=art&hasImages=true`);
        const pieceData = await resp.json(); 
        console.log(pieceData);    
        
            // https://collectionapi.metmuseum.org/public/collection/v1/objects?departmentIds={deptIdChoice}

        const pieces = pieceData.objectIDs;// from that store pieceData.objectIDs in an array
        console.log(pieces);
        return pieces[0]; 
        
    }
    catch (error){
        console.log('error getting dept pieces', error);
    }

}
   
//https://collectionapi.metmuseum.org/public/collection/v1/objects/{objectID}
async function getArt(id)
{
   try{
        const res = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
    const data = await res.json(); //necessary to extract the body (res comes with res.status, res,ok, etc )



   console.log(data); 
   const {title, artistDisplayName, department,  objectDate, primaryImage} = data;
   displayArt(title,artistDisplayName, department, objectDate, primaryImage ); 
  
   }
   catch (error){
        console.log('oopsies!', error);
   }


}




function displayArt(artTitle,  artist, dept, date, img){
        const art_title = document.getElementById('art-title');
        art_title.textContent = `Title: ${artTitle}`

        const artist_name =document.getElementById('art-artist');
        artist_name.textContent = `Artist Name: ${artist}`

        const art_dept =document.getElementById('art-dept');
        art_dept.textContent = `Artist Deparment: ${dept}`

        const art_date = document.getElementById('art-date');
        art_date.textContent = `Date: ${date}`

        const art_img = document.getElementById('art-img');
        art_img.src = img; 
   }




