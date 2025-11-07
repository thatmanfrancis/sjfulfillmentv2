import bcryptjs from "bcryptjs";


export function hashPassword (password: string){
    return bcryptjs.hash(password, 10);
}


export function verifyPassword (password: string, hash: string) {
    return bcryptjs.compare(password, hash);
}

