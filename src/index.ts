import express from "express"

import cors from 'cors'
import { generateId } from "./functions"
import { accountType } from "./type"
import { accounts, transaction } from "./data"
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
        const query = req.query.cpf as string
        const body = req.body
        let date = new Date(`${year}/${month}/${day}`)
        if (!query) {
            errorCode = 406;
            throw new Error("Informe o cpf via query");
        }
        if (query.length < 11) {
            errorCode = 400
            throw new Error("Cpf deve conter 11 caracteres");
            
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
    } catch (error:any) {
        res.status(errorCode).send(error.message)
    }
})

// Tranferência entre contas

app.post("/accounts/:cpf/:name/transfer", (req: express.Request, res: express.Response) => {
    try {

        const {cpf, name} = req.params
        const {nameDestination, cpfDestination} = req.body
        const {statement} = req.body
        const {value, description} = statement
        let {date} = statement

        const [day, month, year] = date.split('/')
        const dateFormatted = new Date(`${year}-${month}-${day}`)

        if (!cpf || !name || !nameDestination || !cpfDestination) {
            res.statusCode = 400
            throw new Error("Não foi possível realizar a tranferência, passou algum dado não preenchido")
        }

        const accountTypeIndex = accounts.findIndex(accountType => accountType.cpf === cpf && accountType.name.toLowerCase() === name.toLowerCase())

        // Verifica o cpf e o nome se já está cadastrado, se for um valor abaixo de 0, então não existe um cliente com o mesmo cpf, no caso sempre vai retornar -1 se não existir na lista
        if (accountTypeIndex < 0) {
            res.statusCode = 404
            throw new Error("Não foi possível realizar a transferência, não existe um cliente cadastrado com esse CPF e nome")
        }

        const accountType = accounts[accountTypeIndex]

        // O método Math.abs() retorna o valor absoluto de um número. O valor absoluto de um número é o valor sem sinal.
        if (Math.abs(value) > accountType.balance) {
            res.statusCode = 406
            throw new Error ("Saldo insuficiente")
        }

        const accountTypeDestinationIndex = accounts.findIndex(accountType => accountType.cpf === cpfDestination)

        // Verifica se o CPF, se for um valor abaixo de 0, então não existe um cliente com o mesmo CPF, no caso sempre vai retornar -1 se não existir na lista.
        if (accountTypeDestinationIndex < 0) {
            res.statusCode = 404
            throw new Error ("Não foi possível realizar a transferência, não existe um cliente cadastrado com esse CPF")
        }

        const accountTypeDestination = accounts[accountTypeDestinationIndex]

        const newTransaction: transaction = {
            value: - value,
            date: new Date(),
            description: `Tranferência de ${accountType.name} para ${nameDestination}`

        }

        const newTransaction2: transaction = {
            value: - value,
            date: new Date(),
            description: `Tranferência de ${accountType.name} para ${nameDestination}`

        }

        accountType.statement.push(newTransaction)
        accountTypeDestination.statement.push(newTransaction2)

        res.status(200).send("Tranferência realizada com sucesso")
    }catch (error:any) {
        if (res.statusCode == 200) {
            res.status(500).send(error.message)
        } else {
            res.status(res.statusCode).send(error.message)
        }
    }
})





