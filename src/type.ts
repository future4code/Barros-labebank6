export type accountType = {
    id: string,
    name: string,
    cpf: string,
    birthDate: string,
    balance:number
    statement:{
        value?:number,
        date?:Date,
        description?:string
    }[]
}