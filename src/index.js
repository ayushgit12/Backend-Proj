// require('dotenv').config({path: './.env'});
import dotenv from 'dotenv';

import connectDB from './db/index.js';

dotenv.config({
     path: './.env'
})
// console.log(process.env.MONGODB_URI)

connectDB()
.then(() => {
     console.log('DB connected');
     app.on('error', (error) => { 
          console.log(`Error occurred: ${error}`)
          throw error
     })

     app.listen(process.env.PORT || 8000, ()=>{
          console.log(`App is listening on port: ${process.env.PORT || 8000}`);
     })
})
.catch((error) => {
     console.log('Error: ', error);
})


/*
import express from 'express';
const app = express();


;( async ()=>{
     try {
          mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`) 
          app.on("error", (error) => {
               console.log(`Error al iniciar el servidor: ${error}`)
               throw error
          })

          app.listen(process.env.PORT, () => {
               console.log("App is listening on port: ", process.env.PORT)
          })
     } catch (error) {
          console.error(error)
          throw new Error('Error al conectar a la base de datos')
     }
})()
*/