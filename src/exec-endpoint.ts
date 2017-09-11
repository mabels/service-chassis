import * as rx from './abstract-rx';
import PayloadParser from './payload-parser';
import * as stream from 'stream';
import { spawn, ChildProcess } from 'child_process';
import RxEndpoint from './rx-endpoint';

export class ExecEndpoint implements RxEndpoint<string> {
  private subProcess: ChildProcess;
  private killTimeout: number;
  private command: string;
  private argv: string[];

  public input: rx.Subject<string>;
  public output: rx.Subject<string>;

  public static command(command: string, argv: string[] = [], killTimeout = 500): ExecEndpoint {
    return new ExecEndpoint(command, argv, killTimeout);
  }

  constructor(command: string, argv: string[], killTimeout: number) {
    this.command = command;
    this.argv = argv;
    this.killTimeout = killTimeout;
    this.input = rx.Observable.create((observer: rx.Observer<string>) => {
      const errorStack: any[] = [];
      this.subProcess = spawn(this.command, this.argv);
      this.subProcess.stdout.on('data', stuff => {
        // console.log(`exec <- ${stuff}`);
        observer.next('' + stuff);
      });
      this.subProcess.stdout.on('error', (error: any) => {
        observer.error(error);
      });
      this.subProcess.on('close', (status, signal) => {
        if (status != 0) {
          observer.error(errorStack.concat({ status: status, signal: signal }));
        } else if (errorStack.length) {
          observer.error(errorStack);
        } else {
          observer.complete();
        }
      });
      this.subProcess.on('error', (_data: any) => {
        errorStack.push(_data);
      });
    });
    this.output = new rx.Subject();
    this.output.subscribe(
      (a) => {
        // console.log(`exec -> ${a}`);
        this.subProcess.stdin.write(a);
      },
      (e) => { /* */ },
      () => {
        this.subProcess.stdin.end();
      }
    );
  }

}

export default ExecEndpoint;
