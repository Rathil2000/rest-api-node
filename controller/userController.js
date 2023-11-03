const { validationResult} = require('express-validator');
const bcrypt = require('bcryptjs');
const db =require('../config/dbConnection');

const randomstring = require('randomstring');
const sendMail = require("../helpers/sendMail")
const register = (req,res)=>{
    const errors =  validationResult(req);
    // console.log(errors);
    if(!errors.isEmpty()){
        return res.status(400).json({errors:errors.array()});
    }
     db.query(
        `SELECT * FROM users WHERE LOWER(email) = LOWER(${db.escape(
            req.body.email
        )});`,
        (err,result)=>{
                if(result && result.length){
                    return res.status(409).send({
                        success:"passed",
                        message: 'This user is already in use!'
                    });
                }
                else{
                    bcrypt.hash(req.body.password, 10, (err,hash)=>{
                        if(err){
                            return res.status(400).send({
                                success:"failed",
                                message:err
                               
                            });
                        }else{
                            db.query(
                                    `INSERT INTO users (name,email,password) VALUES ('${req.body.name}',${db.escape(
                                        req.body.email
                                    )},${db.escape(hash)});`,
                                    (err, result)=>{
                                        if(err){
                                            return res.status(400).send({
                                                success:"failed",
                                                message:err
                                            })
                                        }

                                        let mailSubject = "Mail Verification";
                                        const randomToken = randomstring.generate();
                                        let content = '<p>Hii '+req.body.name+', \
                                         Please <a href="http://127.0.0.1:3000/reset-password?token='+randomToken+'"> Verify</a> your Mail.';
                                        sendMail(req.body.email, mailSubject, content);

                                        db.query('UPDATE users set token=? where email=?',[randomToken,req.body.email], function(error, result, fields){
                                            if(err){
                                                return res.status(400).send({
                                                    success:"failed",
                                                    message:err
                                                })
                                            }
                                        })

                                        console.log("query data is : ",db.query);
                                        return res.status(200).send({
                                            success:"passed",
                                            message:'The user has been registered with us!'
                                            
                                        })
                                        
                                    }
                            )
                        }
                    })
                }
        }
    );

}


const userLogin = async (req, res) => {
    try {
      const { email, password } = req.body
      if (email && password) {
        const user = await UserModel.findOne({ email: email })
        if (user != null) {
          const isMatch = await bcrypt.compare(password, user.password)
          if ((user.email === email) && isMatch) {
            // Generate JWT Token
            const token = jwt.sign({ userID: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '5d' })
            res.send({ "status": "success", "message": "Login Success", "token": token })
          } else {
            res.send({ "status": "failed", "message": "Email or Password is not Valid" })
          }
        } else {
          res.send({ "status": "failed", "message": "You are not a Registered User" })
        }
      } else {
        res.send({ "status": "failed", "message": "All Fields are Required" })
      }
    } catch (error) {
      console.log(error)
      res.send({ "status": "failed", "message": "Unable to Login" })
    }
  }

const verifyMail = (req,res)=>{
    var token = req.query.token;
// console.log(token);
    db.query('SELECT *FROM users where token =? limit 1',token, function(error,result,fields){
        if(error){
            console.log(error.message);
        }
        if(result.length > 0){

            db.query(` UPDATE users SET token = null, is_verified = 1 WHERE id = '${result[0].id}'
            `);
            return res.render('reset-password', {message: 'Mail Verified Successfully!'});
        }else{
            return res.render('404')
        }
    })
}

const resetPasswordLoad = (req,res)=>{
    try{
        var token=req.query.token;
        if(token==undefined){
            res.render('404');
        }
        db.query(`SELECT * FROM users where token=? limit 1`, token, function(error, result, fields){
            if(error){
                console.log(error);
            }
            if(result.length > 0){
                db.query('SELECT * FROM users where email =? limit 1',result[0].email,function(error, result, fields){
                    if(error){
                        console.log(error);
                    }
                    res.render('reset-password',{ user: result[0]});
                })
            }else{
                res.render('404')
            }
        })
    }catch(error){
        console.log(error.message);
    }
}

const resetPassword = (req,res)=>{
    if(req.body.password != req.body.confirm_password){
        res.render('reset-password', { error_message : 'Password not Matching', user:{id:req.body.user_id, email:req.body.email}})
    }
    bcrypt.hash(req.body.confirm_password,10, (err, hash)=>{
        if(err){
            console.log(err);
        }
        db.query(`DELETE FROM password_resets where email = '${req.body.email}'`);
        db.query(`UPDATE users SET password = '${hash}' where id = '${req.body.user_id}'`);
         res.render('message',{ message: 'Password Reset Successfully!'})
    })
}

const forgetPassword = (req,res)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors:errors.array()})
    }
    var email = req.body.email;
    db.query('SELECT * FROM users where email=? limit 1', email, function(error,result, fields ){
        if(error){
            return res.status(400).json({message:error})
        }
        if(result.length >0){
            let mailSubject = "Forget Password";
            const randomstring= randomstring.generate();
            let content = '<p>Hii,  '+result[0].name+' \
            Please <a href="http://127.0.0.1:3000/reset-password?token='+randomstring+'"> Click Here</a> to Reset your Password<p>\
            ';
            sendMail(email,mailSubject,content);
            db.query(
                `INSERT INTO users (email,token) VALUES (${db.escape(result[0].email)},'${randomstring}')`
            )
            return res.status(200).send({
                message:"Mail Sent Successfully for Reset Password!"
            })
        }
        return res.status(401).send({
            message:"Email doesn't exists!"
        })
    })
}

module.exports = {
    register,
    userLogin,
    verifyMail,
    resetPasswordLoad,
    resetPassword,
    forgetPassword
}