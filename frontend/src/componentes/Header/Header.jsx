import { usePub } from "../../context/pubContext"

import "./Header.css";



export const Header =()=>{
    const pub = usePub()


    return (
    <nav className="navBar">
        <div className="logo-container">
            <img src={pub.logo} alt={pub.name} />
        </div>
        <p>{pub.description}</p>
    </nav>
)

}