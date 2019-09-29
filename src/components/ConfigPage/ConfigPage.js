import React from 'react'
import Authentication from '../../util/Authentication/Authentication'
import Form from 'react-bootstrap/Form'
import Button from 'react-bootstrap/Button'
import 'bootstrap/dist/css/bootstrap.min.css'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemText from '@material-ui/core/ListItemText'
import IconButton from '@material-ui/core/IconButton'
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import DeleteIcon from '@material-ui/icons/Delete'
import './Config.css'
import { observer } from "mobx-react"
import {observable, action} from "mobx"
import {Formik} from 'formik'
import * as Yup from 'yup'

// @observer
export default class ConfigPage extends React.Component{
    // @observable options = ['test', 'test1', 'test2'];

    constructor(props){
        super(props)
        this.Authentication = new Authentication()

        //if the extension is running on twitch or dev rig, set the shorthand here. otherwise, set to null.
        this.twitch = window.Twitch ? window.Twitch.ext : null
        this.state={
            finishedLoading:false,
            theme:'light',
            inputValue: '',
            options: []
            // options: {
            //     'option-1': 'test',
            //     'option-2': 'test1'
            // }
        }
        this.addOption = this.addOption.bind(this);
    }

    contextUpdate(context, delta){
        if(delta.includes('theme')){
            this.setState(()=>{
                return {theme:context.theme}
            })
        }
    }

    componentDidMount(){
        // do config page setup as needed here
        console.log(this.state);
        if(this.twitch){
            this.twitch.onAuthorized((auth)=>{
                this.Authentication.setToken(auth.token, auth.userId)
                if(!this.state.finishedLoading){
                    // if the component hasn't finished loading (as in we've not set up after getting a token), let's set it up now.

                    // now we've done the setup for the component, let's set the state to true to force a rerender with the correct data.
                    this.setState(()=>{
                        return {finishedLoading:true}
                    })
                }
            })

            this.twitch.onContext((context,delta)=>{
                this.contextUpdate(context,delta)
            })
        }
    }

    addOption (val) {
        console.log(val)
        this.setState(state => {
            const options = state.options.concat(val.option);
            return {
                options
              };}
        );
        // var timestamp = (new Date()).getTime();
        // console.log(timestamp);
        // console.log(event.value);
        // this.state.options['option-' + timestamp ] = event.value;
    }

    clear() {
        this.setState({options: []});
    }

    submit() {
        this.Authentication.makeCall("http://localhost:8081/poll", "POST", {
            question: this.state.inputValue,
            options: JSON.stringify(this.state.options.map((option, index) => ({id: index, value: option})))
        })
    }

    update(e) {
        this.setState({ inputValue: e.target.value })
    }

    render(){
        const items = this.state.options.map(item => <ListItem>{item}</ListItem> );
        if(this.state.finishedLoading && this.Authentication.isModerator()){
            return(
                <div className="Config">
                    <div className={this.state.theme==='light' ? 'Config-light' : 'Config-dark'}>
                        {/* There is no configuration needed for this extension! */}
                        <Form>
                        <Form.Label>Question:</Form.Label>
                        <Form.Control className="q-input" size="sm" type="text" placeholder="Enter question here" onChange={(e) => this.update(e)}/>
                        <Button className="btn" variant="secondary" type="reset" onClick={() => this.clear()}>Clear</Button>
                        <Button className="btn" variant="primary" type="submit" onClick={() => this.submit()}>
                        Submit
                        </Button>
                    </Form>
                         <List>
                            {items}
                        </List>
                        <Formik
      onSubmit={(val) => this.addOption(val)}
      initialValues={{
          option: '',
      }}
      validationSchema={Yup.object().shape({option: Yup.string()})}
    >
      {({
        handleSubmit,
        handleChange,
        handleBlur,
        values,
        touched,
        isValid,
        errors,
      }) => (
                    <Form onSubmit={handleSubmit}>
                        <Form.Control size="sm" name="option" type="text" value={values.option} onChange={handleChange} placeholder="Add options here" />
                        <Button className="btn" variant="primary" type="submit">
                        Add
                        </Button>
                    </Form>)}
                    </Formik>
                    </div>
                </div>
            )
        }
        else{
            return(
                <div className="Config">
                    <div className={this.state.theme==='light' ? 'Config-light' : 'Config-dark'}>
                        Loading...
                    </div>
                </div>
            )
        }
    }
}