import express from "express"

import cors from 'cors'
import { generateId } from "./functions"
import { accountType } from "./type"
import { accounts } from "./data"
import { builtinModules } from "module"

const app = express()

app.use(express.json())

app.use(cors())

app.listen(3003, () => {
    console.log("Server is running in http://localhost:3003");
});

//Retornar todas as contas 

app.get("/users", (req: express.Request, res: express.Response) => {
    res.status(200).send(accounts)
})


// Criar nova conta
app.post("/users/createAccount", (req: express.Request, res: express.Response) => {
    let errorCode = 400;
    try {
        const body = req.body
        if (!body.name || !body.cpf || !body.birthDay) {
            errorCode = 400;
            throw new Error("Preencha os campos corretamente: name, cpf, birthDay");
        }
        const [day, month, year] = body.birthDay.split("/")
        const birthInDate = new Date(`${year}-${month}-${day}`)
        const ageInMiliseconds = Date.now() - birthInDate.getTime()
        const age = ageInMiliseconds / 1000 / 60 / 60 / 24 / 365
        const id = generateId(30)
        if (age < 18) {
            errorCode = 403;
            throw new Error("Usuário menor de 18 anos");
        } else if (body.cpf.length < 11) {
            errorCode = 401
            throw new Error("Cpf invalido");
        }
        const newAccount: accountType = {
            id:id,
            name:body.name,
            cpf:body.cpf,
            birthDate: body.birthDay,
            balance: 0,
            statement: [{}]
        }

        res.status(201).send(newAccount)
    } catch (error: any) {
        res.status(errorCode).send(error.message)
    }
})


// Pegar saldo

app.get("/users/balance", (req: express.Request, res: express.Response) => {
    let errorCode = 400;
    const body = req.body
    try {
        if (!body.name || !body.cpf) {
            errorCode = 400
            throw new Error("Preencha os campos corretamente: name, cpf");
        }
        const getUser = accounts.filter((element) => {
            return element.name === body.name && element.cpf === body.cpf
        })
        if (getUser.length === 0) {
            errorCode = 404;
            throw new Error("Usuário não encontrado");
        } else {
            const userBalance = getUser.map((element) => {
                return element.balance
            })
            res.status(200).send(userBalance)
        }
    } catch (error:any) {
        res.status(errorCode).send(error.message)
    }
})


// Atualizar saldo

app.put("/users/addNewBalance", (req: express.Request, res: express.Response) => {
    let errorCode = 400
    const body = req.body;
    try {
        if (!body.name || !body.cpf || !body.value) {
            errorCode=400;
            throw new Error("Preencha os campos corretamente: name, cpf e value");
        } else if (isNaN(body.value)){
            errorCode = 400;
            throw new Error("A propriedade 'value' não é um número");
        }
        let getUser = accounts.filter((element) =>{
            return element.name === body.name && element.cpf === body.cpf
        })
        if (getUser.length === 0) {
            errorCode = 404;
            throw new Error("Usuário não encontrado");
        } else {
            getUser[0].balance +=body.value
            getUser[0].statement=[{
                value: body.value,
                date: new Date(),
                description:"Depósito"
            }]
            res.status(201).send(getUser)
        }
    } catch (error:any) {
        res.status(errorCode).send(error.message)
        
    }
})


app.post("/users/payment", (req: express.Request, res: express.Response) => {
    let errorCode = 400
    let today = new Date()
    let day = today.getDate()
    let month = today.getMonth() + 1
    let year = today.getFullYear()
    try {
        const query = req.query.cpf
        const body = req.body
        let date = new Date(`${year}/${month}/${day}`)
        if (!query) {
            errorCode = 406;
            throw new Error("Informe o cpf via query");
        }
        if (!body.value || !body.description) {
            errorCode = 400
            throw new Error("Informe o valor e descrição via body");
        }
        if (!body.date) {
            body[0].date = date
        } else if(body.date) {
            const [dayUser, monthUser, yearUser] = body.date.split("/")
            let dateToCompare = new Date(`${yearUser}-${monthUser}-${dayUser}`)
            if (dateToCompare < date) {
                errorCode = 406;
                throw new Error("Data informada é invalida");
            } else {
                let newStatement = {
                    value:body.value,
                    date:body.date,
                    description:body.description
                }
                // modifica o array de dados
                for (let index = 0; index < accounts.length; index++) {
                    const element = accounts[index];
                    if (element.cpf === query) {
                        element.balance = element.balance - body.value
                        element.statement.push(newStatement)
                    }
                    // checa se o usuário possui dinheiro
                    if (element.balance < 0) {
                        errorCode = 406;
                        element.balance = element.balance + body.value
                        throw new Error("Você não possui dinheiro para pagar essa conta.");
                    }
                    
                }
                // ver se o usuário existe
                const selectUser = accounts.filter((element) => {
                    return element.cpf === query
                })
                if (selectUser.length === 0) {
                    errorCode = 404;
                    throw new Error("Usuário não encontrado");
                } else {
                    res.status(201).send(accounts)
                }
            }
            
        }
    } catch (error) {
        
    }
})


