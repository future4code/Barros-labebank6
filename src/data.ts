import { accountType } from "./type";
import { generateId } from "./functions";

export const accounts:accountType[] = [
    {
        id: generateId(30),
        name: "Leonardo Barros",
        cpf: "40598938750",
        birthDate:"21/08/1998",
        balance: 2000,
        statement: [{
            value: 600,
            date: new Date(),
            description: "Lorem ipsum"
        }]
    },
    {
        id: generateId(30),
        name: "Ayodele",
        cpf: "65798736489",
        birthDate: "25/01/1995",
        balance: 0,
        "statement": [
            {}
        ]
    }
]