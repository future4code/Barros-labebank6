import express from "express"

import cors from 'cors'
import { generateId } from "./functions"
import { accountType } from "./type"
import { accounts } from "./data"

const app = express()

app.use(express.json())

app.use(cors())

app.listen(3003, () => {
    console.log("Server is running in http://localhost:3003");
});


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