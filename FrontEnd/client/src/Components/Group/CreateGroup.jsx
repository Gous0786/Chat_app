import React, { useState } from 'react';
import { FaArrowLeft } from "react-icons/fa6";
import SelectedMembers from './SelectedMembers';
import ChatCard from '../ChatCard/ChatCard';
import { BsArrowRight } from 'react-icons/bs';
import NewGroup from './NewGroup';
import { useDispatch, useSelector } from 'react-redux';
import { searchUser } from '../../Redux/Auth/Action';

const CreateGroup = ({ setIsGroup }) => {
    const [newGroup, setNewGroup] = useState(false);
    const [groupMember, setGroupMember] = useState(new Set());
    const [query, setQuery] = useState("");
    const dispatch = useDispatch();
    const token = localStorage.getItem("jwt");

    const handleRemoveMember = (item) => {
        setGroupMember(prev => {
            const updatedGroup = new Set(prev);
            updatedGroup.delete(item);
            return updatedGroup;
        });
    };

    const { auth } = useSelector(store => store);

    const handleSearch = (searchQuery) => {
        if (searchQuery) {
            dispatch(searchUser({ keyword: searchQuery, token }));
        }
    };

    const handleAddMember = (item) => {
        setGroupMember(prev => {
            const updatedGroup = new Set(prev);
            updatedGroup.add(item);
            return updatedGroup;
        });
        setQuery("");  // Clear search input after adding a member
    };

    return (
        <div className='w-full h-full flex flex-col overflow-hidden'>
            {!newGroup ? (
                <div className='flex-grow'>
                    <div className='flex items-center space-x-10 bg-white/20 backdrop-blur-lg rounded-tl-lg rounded-tr-lg shadow-lg text-white pt-16 px-10 pb-5'>
                        <FaArrowLeft className='cursor-pointer text-2xl font-bold' />
                        <p className='text-xl font-semibold'>Add Group participants</p>
                    </div>
                    <div className='relative py-4 px-3 bg-white/20 backdrop-blur-lg shadow-lg'>
                        <div className='flex space-x-2 flex-wrap space-y-1'>
                            {groupMember.size > 0 && Array.from(groupMember).map(item => (
                                <SelectedMembers
                                    key={item.id} // Ensure key uses unique identifier
                                    handleRemoveMember={() => handleRemoveMember(item)}
                                    member={item}
                                />
                            ))}
                        </div>
                        <input
                            type="text"
                            onChange={(e) => {
                                const value = e.target.value;
                                setQuery(value);
                                handleSearch(value);
                            }}
                            className='outline-none bg-white/20 backdrop-blur-lg border-b p-2 w-[93%]'
                            placeholder='Search user'
                            value={query}
                        />
                    </div>
                    <div className='bg-white/20 backdrop-blur-lg overflow-y-scroll h-[30.2vh] shadow-lg'>
                        {query && auth.searchUser?.map((item) => (
                            <div
                                key={item.id} // Use a unique identifier as key
                                onClick={() => handleAddMember(item)}
                                className='cursor-pointer'
                            >
                                <hr />
                                <ChatCard userImg={item.profile_picture} name={item.full_name} />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <NewGroup setIsGroup={setIsGroup} groupMember={Array.from(groupMember)} /> 
            )}

            {groupMember.size > 0 && ( // Render the button only if there are members selected
                <div className='py-10 bg-white/10 backdrop-blur-lg flex items-center justify-center shadow-lg rounded-bl-lg rounded-br-lg'>
                    <div
                        className='bg-white/20 backdrop-blur-lg rounded-full p-2 cursor-pointer overflow-hidden'
                        onClick={() => setNewGroup(true)}
                    >
                        <div className='flex justify-center items-center h-8 w-8'>
                            <BsArrowRight className='text-white font-bold text-2xl' />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateGroup;
