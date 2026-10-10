

const dropdown = document.getElementById('deparments');
const btn = document.getElementById('submit'); 

btn.addEventListener('click', 
    () => getArt()); 


   
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

   function displayArt(artTitle, artist, date){
        const art_title = document.getElementById('art-title');
        art_title.textContent = `Title: ${artTitle}`

        const artist_name =document.getElementById('art-artist');
        artist_name.textContent = `Artist Name: ${artist}`

        const art_date = document.getElementById('art-date');
        art_date.textContent = `Date: ${date}`
   }



}





