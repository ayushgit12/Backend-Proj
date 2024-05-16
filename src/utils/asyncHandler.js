// const asyncHandler = (fn)=> async (req,res,next)=> {
//      try {
//           await fn(req,res,next);
//      } catch (error) {
//           resizeBy.status(error.code || 500).json({
//                message: error.message,
//                success: false
//           })
//      }
// }

const asyncHandler = (requestHandler) => {
     (req,res,next) => {
          Promise.resolve(requestHandler(req,res,next))
          .catch((err)=>next(err))
     }
}

export {asyncHandler};