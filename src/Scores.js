import React, { Component } from 'react';
import firebase from 'firebase';
import {
    RadialBarChart, RadialBar, LabelList, Tooltip
} from 'recharts';
import * as d3 from 'd3';

// Component representing the scores page
export class Scores extends Component {
    constructor(props) {
        super(props);
        this.state = {
            scoreData: [],
            game: "Snake"
        }
    }

    // Convert snapshot into array for iteration during render
    snapshotToArray(snapshot) {
        let returnArr = [];
        snapshot.forEach(childSnapshot => {
            let item = childSnapshot.val();
            item.key = childSnapshot.key;
            // To get descending scores, need to unshift instead of push to reverse order
            if (this.state.game === "FifteenPuzzle") {
                returnArr.push(item);
            } else {
                returnArr.unshift(item);
            }
        });
        return returnArr;
    }

    // Changes the game data to be shown
    changeGame(name) {
        this.setState({ game: name });
    }

    render() {
        return (
            <div className="scores-container">
                <div className="dropdown">
                <label htmlFor="dropdown">Game:</label>
                    <select className="form-control" aria-labelledby="dropdownMenuButton" onChange={(event) => {
                        this.changeGame(event.target.value);
                    }}>
                        <option value="Snake" className="dropdown-item" >Snake</option>
                        <option value="Reacteroids" className="dropdown-item">Reacteroids</option>
                        <option value="FifteenPuzzle" className="dropdown-item">Fifteen Puzzle</option>
                    </select>
                </div>
                <div className="charts">
                    {this.state.game === "Snake" && <Charts name="SnakeScores" snapshotToArray={(snapshot) => this.snapshotToArray(snapshot)} />}
                    {this.state.game === "Reacteroids" && <Charts name="ReacteroidsScores" snapshotToArray={(snapshot) => this.snapshotToArray(snapshot)} />}
                    {this.state.game === "FifteenPuzzle" && <Charts name="FifteenPuzzleScores" snapshotToArray={(snapshot) => this.snapshotToArray(snapshot)} />}
                </div>
            </div>
        )
    }
}


// Component representing data for Snake game
class Charts extends Component {
    constructor(props) {
        super(props);
        this.state = {
            scoreData: [],
            user: ""
        }
    }
    // On mount, pull from the "scores" table in the database
    componentDidMount() {
        let ref = firebase.database().ref(this.props.name);
        let name = firebase.auth().currentUser.displayName;

        let scores = ref.orderByChild("score");
        scores.on('value', (snapshot => {
            let dat = this.props.snapshotToArray(snapshot);
            this.setState({ scoreData: dat, user: name });
        }));
    }

    //function that takes an array and changes the fill color
    //of the items in that array (used for radial chart)
    changeColor(array) {
        array.forEach((d) => {
            if (d.key === this.state.user) {
                d.fill = "#212529";
            } else {
                d.fill = "#C0B3A0";
            }
        })
    }

    //function that takes in an array to iterate over and
    //a name to filter by, returns an array representing
    //data for specific user
    getData(array, name) {
        let returnArr = [];
        array.forEach((d) => {
            if (d.name === name) {
                returnArr.push(d);
            }
        });
        return returnArr;
    }

    //function that takes an array to push to, data to filter by,
    //and stateData to use. 
    pushData(array, data, stateData) {
        data.forEach((d) => {
            let arr = this.getData(stateData, d);
            arr.forEach((d) => {
                array.push(d);
            });
        });
    }

    //function that takes in a user and data
    //and returns that users top score for specific game
    getUserTopScore(user, data) {
        let obj = [];
        let rank = data.length;
        data.forEach((d, i) => {
            if (d.name === user && rank > i) {
                obj = d;
                obj.rank = i + 1;
                rank = obj.rank;
            }
        })
        return obj;
    }

    render() {
        let userScores = this.getData(this.state.scoreData, this.state.user);
        //gets users top score for this game
        let userTopScore = this.getUserTopScore(this.state.user, this.state.scoreData);
        let topTen = []; //top ten scores
        let amount = 0; //top 10 or less counter
        let names = []; //names of top 10 players
        if (this.state.scoreData.length < 10) {
            amount = this.state.scoreData.length;
        } else {
            amount = 10;
        }

        //stores data for rendering in radial chart and table
        for (let i = 0; i < amount; i++) {
            if (this.state.scoreData[i].name !== this.state.user) {
                if (!names.includes(this.state.scoreData[i].name)) {
                    //get names of top 10 players
                    names.push(this.state.scoreData[i].name);
                }
            }
            topTen.push(this.state.scoreData[i]);
        }
        //get top 10 player avgs and push them on user average data
        this.pushData(userScores, names, this.state.scoreData);

        //organizes data to put into recharts RadialBarChart
        let radialData = d3.nest()
            .key(function (d) { return d.name; })
            .rollup(function (v) { return d3.mean(v, function (d) { return d.score; }) })
            .entries(userScores);
        this.changeColor(radialData);
        return (
            <div className="charts-container">
                <div className="flex-item">
                    <table>
                        <tbody>
                            <tr>
                                <th>Rank</th>
                                <th>Username</th>
                                <th>Score</th>
                            </tr>
                            {//top ten scores
                                topTen.map((d, i) => {
                                    if (d.name === this.state.user) {
                                        return (
                                            <tr className="userTopScore" key={'item-' + i}>
                                                <td>{i + 1}</td>
                                                <td>{Object.entries(d)[0][1]}</td>
                                                <td>{Object.entries(d)[1][1]}</td>
                                            </tr>
                                        );
                                    } else {
                                        return (
                                            <tr key={'item-' + i}>
                                                <td>{i + 1}</td>
                                                <td>{Object.entries(d)[0][1]}</td>
                                                <td>{Object.entries(d)[1][1]}</td>
                                            </tr>
                                        );
                                    }
                                })
                            }
                            { /*Shows user top score if its not in the top 10*/
                                userTopScore.rank > 10 && 
                                <tr key={"item-User"} id="userScore">
                                    <td>{userTopScore.rank}</td>
                                    <td>{userTopScore.name}</td>
                                    <td>{userTopScore.score}</td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
                <div className="flex-item">
                    <h4 id="avg">Your Average vs. Top Ten Average</h4>
                    <RadialBarChart width={750} height={750} innerRadius="10%" outerRadius="80%" data={radialData} startAngle={180} endAngle={0}>
                        <Tooltip content={<CustomTooltip name={this.props.name} data={radialData} />} />
                        <RadialBar minAngle={15} background clockWise={true} dataKey='value' >
                            <LabelList dataKey="key" fill="#EEE" />
                        </RadialBar>
                    </RadialBarChart>
                </div>
            </div>
        )
    }
}

//react component that renders a tooltip when hovering over the radial chart
class CustomTooltip extends Component {
    render() {
        let scoreType = this.props.name === "FifteenPuzzleScores" ? "move(s)" : "points";
        let object = this.props.data[this.props.label];
        if (object) {
            return (
                <div className="custom-tooltip">
                    <p>{"Average Score: " + Math.round(object.value) + " " + scoreType}</p>
                    <p>{}</p>
                </div>
            );
        } else {
            return null;
        }
    }
}