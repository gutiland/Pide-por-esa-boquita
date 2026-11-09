import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/authContext";

export default function RutaPrivada({children}){
    const {account, token, loading} = useAuth();
    if(loading){
        return <p>Comprobando sesión...</p>
    }
    if(!account || !token){
        return <Navigate to="/pub/login" replace />
    }
    return children
}