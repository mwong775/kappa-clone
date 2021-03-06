import React from 'react'
import Authentication from '../../util/Authentication/Authentication'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import './App.css'
import { PieChart } from 'react-chartkick'
import 'chart.js'
import { runInThisContext } from 'vm';

export default class App extends React.Component{
    constructor(props){
        super(props)
        this.Authentication = new Authentication()

        //if the extension is running on twitch or dev rig, set the shorthand here. otherwise, set to null.
        this.twitch = window.Twitch ? window.Twitch.ext : null
        this.state={
            finishedLoading:false,
            theme:'light',
            isVisible:true,

            question: 'Loading ...',
            options: [{ id: 1, value: 'loading' }, { id: 2, value: 'loading' }, { id: 3, value: 'loading' }],
            votes: [],
            selectedOption: '',
        }
    }

    contextUpdate(context, delta){
        if(delta.includes('theme')){
            this.setState(()=>{
                return {theme:context.theme}
            })
        }
    }

    visibilityChanged(isVisible){
        this.setState(()=>{
            return {
                isVisible
            }
        })
    }

    componentDidMount(){
        if(this.twitch){
            this.twitch.onAuthorized((auth)=>{
                this.Authentication.setToken(auth.token, auth.userId)
                setInterval(() => {
                    this.Authentication.makeCall("http://localhost:8081/votes").then(res => res.json()).then((data) => {
                        this.setState({question: data.question, options: data.options, votes: data.votes})
                    })
                }, 1000)

                if(!this.state.finishedLoading){
                    // if the component hasn't finished loading (as in we've not set up after getting a token), let's set it up now.

                    // now we've done the setup for the component, let's set the state to true to force a rerender with the correct data.
                    this.setState(()=>{
                        return {finishedLoading:true}
                    })
                }
            })

            this.twitch.listen('broadcast',(target,contentType,body)=>{
                this.twitch.rig.log(`New PubSub message!\n${target}\n${contentType}\n${body}`)
                // now that you've got a listener, do something with the result...

                // do something...

            })

            this.twitch.onVisibilityChanged((isVisible,_c)=>{
                this.visibilityChanged(isVisible)
            })

            this.twitch.onContext((context,delta)=>{
                this.contextUpdate(context,delta)
            })
        }
    }

    componentWillUnmount(){
        if(this.twitch){
            this.twitch.unlisten('broadcast', ()=>console.log('successfully unlistened'))
        }
    }

    vote(i) {
        console.log(this.state.options[i])
        this.setState({selectedOption: this.state.options[i].id})
        this.Authentication.makeCall("http://localhost:8081/vote", "POST", {
            optionId: this.state.options[i].id
        })
    }

    render(){
        const items = this.state.options.map((item, index) => <ListItem button onClick={() => this.vote(index)}>{this.state.selectedOption === item.id ? <b>{item.value}</b> : item.value}</ListItem>);

        const optionsObj = {}
        this.state.options.forEach((option) => { optionsObj[option.id] = option.value })

        if (this.state.finishedLoading && this.state.isVisible) {
            return (
                <div className={"App " + (this.props.layout == 'VC' ? 'VC' : '') + (this.props.layout == 'overlay' ? 'overlay' : '') }>
                    <div className={this.state.theme === 'light' ? 'App-light' : 'App-dark'}>
                        <h2>{this.state.question}</h2>
                        <List>
                            {items}
                        </List>
                        {/* <h1>Hello world!</h1> */}
                        {/* <p>My token is: {this.Authentication.state.token}</p> */}
                        {/* <p>My opaque ID is {this.Authentication.getOpaqueId()}.</p> */}
                        {/* <div>{this.Authentication.isModerator() ? <p>I am currently a mod, and here's a special mod button <input value='mod button' type='button'/></p>  : 'I am currently not a mod.'}</div> */}
                        {/* <p>I have {this.Authentication.hasSharedId() ? `shared my ID, and my user_id is ${this.Authentication.getUserId()}` : 'not shared my ID'}.</p> */}
                    </div>
                    <PieChart data={this.state.options.map((option) => ([optionsObj[option.id], this.state.votes[option.id]]))} />
                </div>
            )
        }else{
            return (
                <div className="App">
                </div>
            )
        }

    }
}