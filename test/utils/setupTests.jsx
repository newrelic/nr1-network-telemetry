import Adapter from "enzyme-adapter-react-16";
import { configure } from "enzyme";

// Sets up enzyme to know what version of react its working with.
configure({ adapter: new Adapter() });
