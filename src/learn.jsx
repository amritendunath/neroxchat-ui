// const function Singleton (argument) {
//     // the cached instance
//     var instance;

//     // rewrite the constructor
//     Singleton = function Singleton(argument) {
//         return instance;
//     };
    
//     // carry over the prototype properties
//     Singleton.prototype = this;

//     // the instance
//     instance = new Singleton();

//     // reset the constructor pointer
//     instance.constructor = Singleton;

//     // code ...

//     return instance;
// }

const Singleton = (
    function () {
        let instance; // private variable to hold the single instance

        function create() {
            return { id: Math.random() }; // creates a new object
        }

        return {
            getInstance() {
                // if instance exists, return it; otherwise create one
                return instance || (instance = create());
            }
        }
    }
)();
const a = Singleton.getInstance();
const b = Singleton.getInstance();

console.log(a === b); // true (same object)
console.log(a.id, b.id); // same id value

class Counter extends React.Component {
  constructor() {
    super();
    this.state = { count: 0 };
  }
  render() {
    return <button onClick={() => this.setState({ count: this.state.count + 1 })}>
      {this.state.count}
    </button>;
  }
}
